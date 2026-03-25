#!/usr/bin/env python3

import re
import subprocess
import sys
from pathlib import Path

def extract_featured_image(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    frontmatter_match = re.search(r'^---\n(.*?)\n---', content, re.DOTALL)
    if frontmatter_match:
        frontmatter = frontmatter_match.group(1)
        hero_match = re.search(r'(?:featured_image|heroImage):\s*["\']?(https?://[^"\'\s]+)["\']?', frontmatter)
        if hero_match:
            return hero_match.group(1).strip('"').strip("'")
    return None

def check_url(url):
    try:
        result = subprocess.run(['curl', '-sI', '--max-time', '5', url], capture_output=True, timeout=10)
        return '200' in result.stdout.decode()
    except:
        return False

# Get all files
files = list(Path('src/content/blog').glob('*.mdx'))
total_checked = 0
broken_count = 0
broken_files = []

print(f"Checking {len(files)} files...")

for i, file_path in enumerate(files):
    img_url = extract_featured_image(file_path)
    if img_url:
        total_checked += 1
        print(f"{i+1:3d}. {file_path.name[:40]:<40} ", end="", flush=True)
        
        if check_url(img_url):
            print("✅")
        else:
            print("❌")
            broken_count += 1
            broken_files.append((file_path.name, img_url))

print(f"\nSUMMARY:")
print(f"Files with images: {total_checked}")
print(f"Broken images: {broken_count}")

if broken_files:
    print(f"\nBROKEN FILES:")
    for filename, url in broken_files:
        print(f"  {filename}: {url}")