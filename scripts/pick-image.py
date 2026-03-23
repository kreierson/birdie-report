#!/usr/bin/env python3
"""Pick a verified golf image from the curated pool.

Usage:
  python3 scripts/pick-image.py --category irons_clubs
  python3 scripts/pick-image.py --category golfer_swinging --exclude photo-1535131749006
  python3 scripts/pick-image.py --list-categories
  python3 scripts/pick-image.py --list-used

Categories: irons_clubs, golfer_swinging, putting_green, golf_course, driving_range_practice

The script checks which images are already used in articles and excludes them.
"""

import json
import os
import re
import sys
import argparse

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POOL_FILE = os.path.join(REPO_ROOT, "verified-golf-images.json")
CONTENT_DIR = os.path.join(REPO_ROOT, "src", "content", "blog")

def get_used_images():
    """Get all featured_image photo IDs already used in articles."""
    used = set()
    for f in os.listdir(CONTENT_DIR):
        if not f.endswith('.mdx'):
            continue
        path = os.path.join(CONTENT_DIR, f)
        with open(path) as fh:
            content = fh.read(2000)  # frontmatter is in first 2k
            match = re.search(r'featured_image:\s*["\']([^"\']+)', content)
            if match:
                url = match.group(1)
                # Extract photo ID
                pid = re.search(r'(photo-[a-f0-9-]+)', url)
                if pid:
                    used.add(pid.group(1))
    return used

def main():
    parser = argparse.ArgumentParser(description="Pick a verified golf image")
    parser.add_argument("--category", "-c", help="Image category")
    parser.add_argument("--exclude", "-e", nargs="*", default=[], help="Photo IDs to exclude")
    parser.add_argument("--list-categories", action="store_true")
    parser.add_argument("--list-used", action="store_true")
    parser.add_argument("--all", action="store_true", help="Show all available (unused) images")
    args = parser.parse_args()

    with open(POOL_FILE) as f:
        pool = json.load(f)

    if args.list_categories:
        for cat, images in pool["images"].items():
            print(f"  {cat}: {len(images)} images")
        return

    used = get_used_images()

    if args.list_used:
        print(f"Used images ({len(used)}):")
        for pid in sorted(used):
            print(f"  {pid}")
        return

    if args.all:
        for cat, images in pool["images"].items():
            available = [img for img in images if img["id"] not in used and img["id"] not in args.exclude]
            if available:
                print(f"\n{cat}:")
                for img in available:
                    url = f"https://images.unsplash.com/{img['id']}?w=1200&q=80"
                    print(f"  {url}")
                    print(f"    {img['desc']}")
        return

    if not args.category:
        print("Error: --category required (or use --list-categories, --all)")
        sys.exit(1)

    if args.category not in pool["images"]:
        print(f"Error: unknown category '{args.category}'")
        print(f"Available: {', '.join(pool['images'].keys())}")
        sys.exit(1)

    images = pool["images"][args.category]
    exclude = set(args.exclude) | used
    available = [img for img in images if img["id"] not in exclude]

    if not available:
        print(f"No unused images in category '{args.category}'")
        print("Available categories with unused images:")
        for cat, imgs in pool["images"].items():
            avail = [i for i in imgs if i["id"] not in exclude]
            if avail:
                print(f"  {cat}: {len(avail)} available")
        sys.exit(1)

    img = available[0]
    url = f"https://images.unsplash.com/{img['id']}?w=1200&q=80"
    print(url)
    print(f"# {img['desc']}")

if __name__ == "__main__":
    main()
