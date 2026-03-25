#!/usr/bin/env python3
"""Quick and focused image audit for Birdie Report"""

import re
import json
import subprocess
import random
from pathlib import Path

def run_curl_check(url):
    """Test if URL returns 200 status"""
    try:
        result = subprocess.run(
            ['curl', '-sI', '--max-time', '10', url],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        if result.returncode == 0:
            first_line = result.stdout.split('\n')[0]
            return '200' in first_line
        return False
    except:
        return False

def extract_featured_image(file_path):
    """Extract featured_image from MDX file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    frontmatter_match = re.search(r'^---\n(.*?)\n---', content, re.DOTALL)
    if frontmatter_match:
        frontmatter = frontmatter_match.group(1)
        hero_match = re.search(r'(?:featured_image|heroImage):\s*["\']?(https?://[^"\'\s]+)["\']?', frontmatter)
        if hero_match:
            return hero_match.group(1).strip('"').strip("'")
    return None

def load_verified_images():
    """Load verified golf images"""
    with open('verified-golf-images-FINAL.json', 'r') as f:
        return json.load(f)

def get_random_golf_image(verified_images):
    """Get a random verified golf image"""
    all_images = []
    for category in verified_images['images'].values():
        all_images.extend(category)
    
    if all_images:
        img = random.choice(all_images)
        return f"https://images.unsplash.com/{img['id']}?w=1200&q=80"
    return None

def replace_featured_image(file_path, old_url, new_url):
    """Replace featured_image in MDX file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace in quotes or without quotes
    patterns = [
        f'featured_image: "{old_url}"',
        f"featured_image: '{old_url}'",
        f"featured_image: {old_url}"
    ]
    
    new_content = content
    for pattern in patterns:
        if pattern in content:
            new_content = content.replace(pattern, f'featured_image: "{new_url}"')
            break
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    print("Starting Birdie Report Image Audit...")
    
    # Load verified images
    verified_images = load_verified_images()
    
    # Get all MDX files
    mdx_files = list(Path('src/content/blog').glob('*.mdx'))
    
    results = {
        'total_checked': 0,
        'broken_found': 0,
        'fixed': 0,
        'broken_files': []
    }
    
    for i, mdx_file in enumerate(mdx_files, 1):
        print(f"[{i:3d}/{len(mdx_files)}] {mdx_file.name[:50]:<50}", end="")
        
        # Extract featured image
        featured_image = extract_featured_image(mdx_file)
        
        if not featured_image:
            print(" No image")
            continue
        
        results['total_checked'] += 1
        
        # Test the URL
        if run_curl_check(featured_image):
            print(" ✅")
        else:
            print(" ❌ BROKEN")
            results['broken_found'] += 1
            
            # Get replacement
            replacement_url = get_random_golf_image(verified_images)
            
            if replacement_url and run_curl_check(replacement_url):
                if replace_featured_image(mdx_file, featured_image, replacement_url):
                    print(f"     🔧 Fixed: {replacement_url[:60]}")
                    results['fixed'] += 1
                else:
                    print("     ❌ Failed to replace")
            else:
                print("     ❌ No working replacement found")
            
            results['broken_files'].append({
                'file': str(mdx_file.name),
                'old_url': featured_image,
                'new_url': replacement_url if replacement_url else None
            })
    
    print(f"\n{'='*70}")
    print(f"AUDIT COMPLETE")
    print(f"{'='*70}")
    print(f"Total articles with images: {results['total_checked']}")
    print(f"Broken images found: {results['broken_found']}")
    print(f"Images fixed: {results['fixed']}")
    
    # Save results
    with open('audit_results.json', 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()