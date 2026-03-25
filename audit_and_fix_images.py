#!/usr/bin/env python3
"""
Comprehensive image audit and fix script for Birdie Report.
Checks ALL .mdx files, tests ALL image URLs, and replaces broken ones.
"""

import os
import re
import json
import subprocess
import time
import random
from pathlib import Path

def run_curl_check(url):
    """Test if URL returns 200 status"""
    try:
        result = subprocess.run(
            ['curl', '-sI', url],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        # Check for 200 OK in first line
        if result.returncode == 0:
            first_line = result.stdout.split('\n')[0]
            if '200 OK' in first_line or 'HTTP/2 200' in first_line or 'HTTP/1.1 200' in first_line:
                return True
        return False
    except Exception as e:
        print(f"Error checking {url}: {e}")
        return False

def extract_images_from_mdx(file_path):
    """Extract all image URLs from MDX file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    images = []
    
    # Extract featured_image from frontmatter
    frontmatter_match = re.search(r'^---\n(.*?)\n---', content, re.DOTALL)
    if frontmatter_match:
        frontmatter = frontmatter_match.group(1)
        # Check for both featured_image and heroImage
        hero_match = re.search(r'(?:featured_image|heroImage):\s*["\']?(https?://[^"\'\s]+)["\']?', frontmatter)
        if hero_match:
            images.append({
                'url': hero_match.group(1),
                'type': 'featured_image',
                'line': 'frontmatter'
            })
    
    # Extract inline images
    inline_images = re.findall(r'!\[.*?\]\((https?://[^)]+)\)', content)
    for img_url in inline_images:
        images.append({
            'url': img_url,
            'type': 'inline',
            'line': 'content'
        })
    
    # Extract src attributes
    src_images = re.findall(r'src=["\'](https?://[^"\']+)["\']', content)
    for img_url in src_images:
        images.append({
            'url': img_url,
            'type': 'src_attr',
            'line': 'content'
        })
    
    return images

def load_verified_images():
    """Load verified golf images from JSON file"""
    with open('verified-golf-images-FINAL.json', 'r') as f:
        return json.load(f)

def get_replacement_image(category, verified_images):
    """Get a random replacement image from verified pool"""
    categories = ['golfer_swinging', 'golf_course', 'golf_ball_tee', 'irons_clubs', 'putting_green', 'golf_equipment']
    
    # Try to match category, otherwise use random category
    if category in verified_images['images']:
        pool = verified_images['images'][category]
    else:
        # Use a random category
        available_cats = [cat for cat in categories if cat in verified_images['images']]
        if available_cats:
            pool = verified_images['images'][random.choice(available_cats)]
        else:
            return None
    
    if pool:
        img = random.choice(pool)
        return f"https://images.unsplash.com/{img['id']}?w=1200&q=80"
    return None

def determine_image_category(file_path):
    """Determine what type of golf image would be appropriate"""
    filename = os.path.basename(file_path).lower()
    
    if any(keyword in filename for keyword in ['iron', 'club', 'driver', 'wedge', 'putter']):
        return 'golf_equipment'
    elif any(keyword in filename for keyword in ['course', 'scottsdale', 'pinehurst', 'minnesota', 'public']):
        return 'golf_course'
    elif any(keyword in filename for keyword in ['putt', 'putting']):
        return 'putting_green'
    elif any(keyword in filename for keyword in ['chip', 'bunker', 'technique', 'swing']):
        return 'golfer_swinging'
    else:
        return 'golfer_swinging'  # default

def replace_image_in_file(file_path, old_url, new_url):
    """Replace image URL in MDX file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the URL
    new_content = content.replace(old_url, new_url)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    os.chdir('/Users/kylereierson/code/birdie-report')
    
    # Load verified images
    verified_images = load_verified_images()
    
    # Get all MDX files
    mdx_files = list(Path('src/content/blog').glob('*.mdx'))
    print(f"Found {len(mdx_files)} MDX files to audit")
    
    audit_results = {
        'total_articles': len(mdx_files),
        'articles_with_broken_images': 0,
        'total_broken_images': 0,
        'total_images_fixed': 0,
        'broken_images': []
    }
    
    for i, mdx_file in enumerate(mdx_files, 1):
        print(f"\n[{i}/{len(mdx_files)}] Checking {mdx_file.name}")
        
        # Extract all images
        images = extract_images_from_mdx(mdx_file)
        
        if not images:
            print("  No images found")
            continue
        
        print(f"  Found {len(images)} image(s)")
        
        article_has_broken_images = False
        
        for img in images:
            url = img['url']
            print(f"    Testing {img['type']}: {url[:80]}...")
            
            # Test URL
            if run_curl_check(url):
                print(f"      ✅ OK")
            else:
                print(f"      ❌ BROKEN")
                audit_results['total_broken_images'] += 1
                article_has_broken_images = True
                
                # Find replacement
                category = determine_image_category(mdx_file)
                replacement_url = get_replacement_image(category, verified_images)
                
                if replacement_url:
                    print(f"      🔄 Testing replacement: {replacement_url}")
                    
                    # Verify replacement works
                    if run_curl_check(replacement_url):
                        print(f"      ✅ Replacement OK, updating file...")
                        
                        # Replace in file
                        if replace_image_in_file(mdx_file, url, replacement_url):
                            audit_results['total_images_fixed'] += 1
                            print(f"      ✅ Fixed!")
                        else:
                            print(f"      ❌ Failed to replace in file")
                    else:
                        print(f"      ❌ Replacement also broken!")
                else:
                    print(f"      ❌ No replacement found")
                
                audit_results['broken_images'].append({
                    'file': str(mdx_file),
                    'url': url,
                    'type': img['type'],
                    'fixed': replacement_url is not None
                })
                
                # Small delay to be nice to servers
                time.sleep(0.5)
        
        if article_has_broken_images:
            audit_results['articles_with_broken_images'] += 1
    
    # Save results
    with open('image_audit_results.json', 'w') as f:
        json.dump(audit_results, f, indent=2)
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"IMAGE AUDIT COMPLETE")
    print(f"{'='*60}")
    print(f"Total articles checked: {audit_results['total_articles']}")
    print(f"Articles with broken images: {audit_results['articles_with_broken_images']}")
    print(f"Total broken images found: {audit_results['total_broken_images']}")
    print(f"Images successfully fixed: {audit_results['total_images_fixed']}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()