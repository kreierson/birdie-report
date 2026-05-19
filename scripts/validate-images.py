#!/usr/bin/env python3
"""Validate local and remote image references used by the site."""

from __future__ import annotations

import argparse
import concurrent.futures
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

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
    with urllib.request.urlopen(request, timeout=18) as response:
        content_type = response.headers.get("content-type", "")
        if method == "GET":
            response.read(2048)
        return response.status, content_type


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


def validate_reference(ref: ImageReference) -> tuple[ImageReference, bool, str]:
    if is_local_image(ref.url):
        ok, reason = validate_local(ref)
    elif ref.url.startswith(("http://", "https://")):
        ok, reason = validate_remote(ref)
    else:
        ok, reason = False, "unsupported image URL"

    return ref, ok, reason


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=16, help="parallel remote checks")
    args = parser.parse_args()

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

    failures: list[tuple[ImageReference, str]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        for ref, ok, reason in executor.map(validate_reference, refs):
            if not ok:
                failures.append((ref, reason))

    if failures:
        print(f"Found {len(failures)} broken image reference(s):")
        for ref, reason in failures:
            display_path = ref.file.relative_to(REPO_ROOT)
            print(f"- {display_path} [{ref.kind}] {ref.url}")
            print(f"  {reason}")
        return 1

    print(f"All {len(refs)} image reference(s) passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
