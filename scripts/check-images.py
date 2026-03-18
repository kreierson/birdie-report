#!/usr/bin/env python3
"""Check for duplicate/reused featured images across Birdie Report articles."""

import os
import re
import sys
from pathlib import Path
from collections import Counter

BLOG_DIR = Path(__file__).parent.parent / "src" / "content" / "blog"

def get_all_images():
    """Extract featured_image from all MDX files with their slugs and dates."""
    articles = []
    for f in sorted(BLOG_DIR.glob("*.mdx")):
        content = f.read_text()
        img_match = re.search(r'featured_image:\s*["\']?([^\s"\']+)', content)
        date_match = re.search(r'date:\s*["\']?(\d{4}-\d{2}-\d{2})', content)
        if img_match:
            articles.append({
                "slug": f.stem,
                "image": img_match.group(1),
                "date": date_match.group(1) if date_match else "unknown",
            })
    return articles

def main():
    articles = get_all_images()
    
    # Count image usage
    image_counts = Counter(a["image"] for a in articles)
    
    # Find duplicates
    dupes = {img: count for img, count in image_counts.items() if count > 1}
    
    if dupes:
        print(f"⚠️  Found {len(dupes)} images used more than once:\n")
        for img, count in sorted(dupes.items(), key=lambda x: -x[1]):
            print(f"  Used {count}x: {img}")
            for a in articles:
                if a["image"] == img:
                    print(f"    → {a['slug']} ({a['date']})")
            print()
    else:
        print("✅ All featured images are unique!")
    
    # Output list of all used images (for cron reference)
    if "--list" in sys.argv:
        print("\n--- All used images ---")
        for img in sorted(set(a["image"] for a in articles)):
            print(img)
    
    # Output JSON for programmatic use
    if "--json" in sys.argv:
        import json
        print(json.dumps([a["image"] for a in articles]))

    return 1 if dupes else 0

if __name__ == "__main__":
    sys.exit(main())
