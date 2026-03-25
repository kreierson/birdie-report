#!/usr/bin/env python3
"""Quick test to debug image extraction"""

import re
from pathlib import Path

def extract_images_from_mdx(file_path):
    """Extract all image URLs from MDX file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    images = []
    
    # Extract featured_image from frontmatter
    frontmatter_match = re.search(r'^---\n(.*?)\n---', content, re.DOTALL)
    if frontmatter_match:
        frontmatter = frontmatter_match.group(1)
        print(f"Frontmatter found: {len(frontmatter)} chars")
        
        # Check for both featured_image and heroImage
        hero_match = re.search(r'(?:featured_image|heroImage):\s*["\']?(https?://[^"\'\s]+)["\']?', frontmatter)
        if hero_match:
            url = hero_match.group(1)
            print(f"Found featured image: {url}")
            images.append({
                'url': url,
                'type': 'featured_image',
                'line': 'frontmatter'
            })
        else:
            print("No featured_image found in frontmatter")
            # Let's see what's actually in the frontmatter
            print("Frontmatter content:")
            print(frontmatter[:200])
    else:
        print("No frontmatter found")
    
    return images

# Test on a few files
test_files = [
    'src/content/blog/tiger-woods-tgl-finals-masters-2026.mdx',
    'src/content/blog/chip-shot-technique-around-the-green.mdx',
    'src/content/blog/best-golf-courses-scottsdale-arizona.mdx'
]

for file_path in test_files:
    print(f"\n=== Testing {file_path} ===")
    if Path(file_path).exists():
        images = extract_images_from_mdx(file_path)
        print(f"Found {len(images)} images")
    else:
        print("File not found!")