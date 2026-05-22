#!/usr/bin/env python3
"""Validate local and remote image references used by the site."""

from __future__ import annotations

import argparse
import concurrent.futures
import os
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).resolve().parents[1]
SCAN_DIRS = (REPO_ROOT / "src",)
PUBLIC_DIR = REPO_ROOT / "public"
IMAGE_EXTENSIONS = {".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
}


@dataclass(frozen=True)
class ImageReference:
    file: Path
    kind: str
    url: str


def extract_references(file_path: Path) -> list[ImageReference]:
    content = file_path.read_text(encoding="utf-8", errors="replace")
    refs: list[ImageReference] = []

    for match in re.finditer(r"featured_image:\s*[\"']?([^\"'\n]+)", content):
        refs.append(ImageReference(file_path, "featured_image", match.group(1).strip()))

    for match in re.finditer(r"!\[[^\]]*]\((https?://[^)]+|/[^)]+)\)", content):
        refs.append(ImageReference(file_path, "markdown", match.group(1).strip()))

    for match in re.finditer(r"<img\b[^>]*\bsrc=[\"']([^\"']+)[\"']", content):
        refs.append(ImageReference(file_path, "img", match.group(1).strip()))

    return refs


def is_local_image(url: str) -> bool:
    return url.startswith("/") and not url.startswith("//")


def validate_local(ref: ImageReference) -> tuple[bool, str]:
    local_path = PUBLIC_DIR / ref.url.lstrip("/")
    if not local_path.exists():
        return False, "missing local file"
    if local_path.suffix.lower() not in IMAGE_EXTENSIONS:
        return False, f"local file is not a supported image type: {local_path.suffix}"
    return True, "ok"


def request_remote(url: str, method: str) -> tuple[int, str]:
    request = urllib.request.Request(url, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(request, timeout=18) as response:
            content_type = response.headers.get("content-type", "")
            if method == "GET":
                response.read(2048)
            return response.status, content_type
    except urllib.error.HTTPError as exc:
        return exc.code, exc.headers.get("content-type", "")


def remote_checks_available(refs: list[ImageReference], *, sample_size: int = 3) -> tuple[bool, list[str]]:
    sample_urls: list[str] = []
    seen_hosts: set[str] = set()

    for ref in refs:
        if not ref.url.startswith(("http://", "https://")):
            continue
        host = urlparse(ref.url).netloc
        if not host or host in seen_hosts:
            continue
        sample_urls.append(ref.url)
        seen_hosts.add(host)
        if len(sample_urls) == sample_size:
            break

    if not sample_urls:
        return True, []

    failures: list[str] = []
    for url in sample_urls:
        for method in ("HEAD", "GET"):
            try:
                request_remote(url, method)
                return True, []
            except (urllib.error.URLError, TimeoutError, ValueError) as exc:
                failures.append(f"{url} [{method}] {exc}")

    return False, failures


def validate_remote(ref: ImageReference) -> tuple[bool, str]:
    errors: list[str] = []
    for method in ("HEAD", "GET"):
        try:
            status, content_type = request_remote(ref.url, method)
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            errors.append(f"{method}: {exc}")
            continue

        if status >= 400:
            errors.append(f"{method}: HTTP {status}")
            continue

        normalized_type = content_type.lower()
        if "image" in normalized_type or "octet-stream" in normalized_type:
            return True, "ok"
        errors.append(f"{method}: non-image content-type {content_type or '(none)'}")

    return False, "; ".join(errors)


def validate_reference(ref: ImageReference, *, local_only: bool) -> tuple[ImageReference, bool, str]:
    if is_local_image(ref.url):
        ok, reason = validate_local(ref)
    elif local_only:
        ok, reason = True, "skipped remote check"
    elif ref.url.startswith(("http://", "https://")):
        ok, reason = validate_remote(ref)
    else:
        ok, reason = False, "unsupported image URL"

    return ref, ok, reason


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=16, help="parallel remote checks")
    parser.add_argument("--local-only", action="store_true", help="only validate images served from public/")
    parser.add_argument(
        "--local-only-on-vercel",
        action="store_true",
        help="skip remote checks when running inside Vercel builds",
    )
    args = parser.parse_args()
    local_only = args.local_only or (args.local_only_on_vercel and os.environ.get("VERCEL") == "1")

    files: list[Path] = []
    for scan_dir in SCAN_DIRS:
        files.extend(path for path in scan_dir.rglob("*") if path.suffix in {".astro", ".md", ".mdx"})

    refs: list[ImageReference] = []
    seen: set[tuple[Path, str, str]] = set()
    for file_path in sorted(files):
        for ref in extract_references(file_path):
            key = (ref.file, ref.kind, ref.url)
            if key not in seen:
                refs.append(ref)
                seen.add(key)

    offline_warning: str | None = None
    if not local_only:
        remote_ok, probe_failures = remote_checks_available(refs)
        if not remote_ok:
            local_only = True
            offline_warning = (
                "Remote image validation skipped because this environment could not reach sample remote hosts. "
                + " | ".join(probe_failures[:3])
            )

    failures: list[tuple[ImageReference, str]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        jobs = ((ref, local_only) for ref in refs)
        for ref, ok, reason in executor.map(lambda job: validate_reference(job[0], local_only=job[1]), jobs):
            if not ok:
                failures.append((ref, reason))

    if failures:
        print(f"Found {len(failures)} broken image reference(s):")
        for ref, reason in failures:
            display_path = ref.file.relative_to(REPO_ROOT)
            print(f"- {display_path} [{ref.kind}] {ref.url}")
            print(f"  {reason}")
        return 1

    if offline_warning:
        print(f"Warning: {offline_warning}", file=sys.stderr)

    if local_only:
        local_count = sum(1 for ref in refs if is_local_image(ref.url))
        remote_count = len(refs) - local_count
        print(f"All {local_count} local image reference(s) passed; skipped {remote_count} remote reference(s).")
    else:
        print(f"All {len(refs)} image reference(s) passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
