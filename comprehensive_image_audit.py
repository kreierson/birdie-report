#!/usr/bin/env python3
import os
import re
import subprocess
import json
import time
from pathlib import Path
import frontmatter

def run_curl_check(url):
    """Check if URL returns HTTP 200 status"""
    try:
        result = subprocess.run(['curl', '-sI', url], capture_output=True, text=True, timeout=10)
        # Check for 200 OK in the first line
        if result.stdout:
            first_line = result.stdout.split('\n')[0]
            if '200 OK' in first_line or '200' in first_line:
                return True
        return False
    except Exception as e:
        print(f"Error checking {url}: {e}")
        return False

def extract_images_from_mdx(file_path):
    """Extract all image URLs from an MDX file"""
    images = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse frontmatter
        post = frontmatter.loads(content)
        
        # Check heroImage and featured_image in frontmatter
        if 'heroImage' in post.metadata and post.metadata['heroImage']:
            images.append({
                'url': post.metadata['heroImage'],
                'type': 'heroImage',
                'line': 'frontmatter'
            })
        
        if 'featured_image' in post.metadata and post.metadata['featured_image']:
            images.append({
                'url': post.metadata['featured_image'],
                'type': 'featured_image',
                'line': 'frontmatter'
            })
        
        # Check for inline images in content
        # Look for markdown images: ![alt](url)
        markdown_images = re.findall(r'!\[.*?\]\((https?://[^)]+)\)', post.content)
        for img_url in markdown_images:
            images.append({
                'url': img_url,
                'type': 'markdown',
                'line': 'content'
            })
        
        # Look for HTML img tags
        html_images = re.findall(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', post.content, re.IGNORECASE)
        for img_url in html_images:
            if img_url.startswith('http'):
                images.append({
                    'url': img_url,
                    'type': 'html',
                    'line': 'content'
                })
        
        # Look for other image references
        other_images = re.findall(r'src=["\']([^"\']*\.(?:jpg|jpeg|png|gif|webp))["\']', post.content, re.IGNORECASE)
        for img_url in other_images:
            if img_url.startswith('http') and img_url not in [img['url'] for img in images]:
                images.append({
                    'url': img_url,
                    'type': 'other',
                    'line': 'content'
                })
        
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    
    return images

def audit_all_images():
    """Audit all images in all MDX files"""
    blog_dir = Path('src/content/blog')
    
    results = {
        'total_articles': 0,
        'total_images': 0,
        'broken_images': 0,
        'working_images': 0,
        'articles': {}
    }
    
    print("Starting comprehensive image audit...")
    
    for mdx_file in sorted(blog_dir.glob('*.mdx')):
        print(f"\nChecking: {mdx_file.name}")
        results['total_articles'] += 1
        
        # Extract images from this file
        images = extract_images_from_mdx(mdx_file)
        
        if not images:
            print(f"  No images found")
            results['articles'][str(mdx_file)] = {
                'images': [],
                'broken_count': 0,
                'working_count': 0
            }
            continue
        
        article_results = {
            'images': [],
            'broken_count': 0,
            'working_count': 0
        }
        
        print(f"  Found {len(images)} image(s)")
        
        for i, img_info in enumerate(images):
            url = img_info['url']
            img_type = img_info['type']
            
            print(f"    {i+1}. [{img_type}] {url}")
            
            # Check if image works
            is_working = run_curl_check(url)
            status = "✅ WORKING" if is_working else "❌ BROKEN"
            print(f"       {status}")
            
            img_result = {
                'url': url,
                'type': img_type,
                'location': img_info['line'],
                'working': is_working
            }
            
            article_results['images'].append(img_result)
            results['total_images'] += 1
            
            if is_working:
                results['working_images'] += 1
                article_results['working_count'] += 1
            else:
                results['broken_images'] += 1
                article_results['broken_count'] += 1
            
            # Small delay to be nice to servers
            time.sleep(0.2)
        
        results['articles'][str(mdx_file)] = article_results
    
    return results

def save_audit_results(results):
    """Save audit results to JSON file"""
    with open('comprehensive_audit_results.json', 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    os.chdir('/Users/kylereierson/code/birdie-report')
    
    results = audit_all_images()
    save_audit_results(results)
    
    print(f"\n{'='*60}")
    print(f"COMPREHENSIVE AUDIT COMPLETE")
    print(f"{'='*60}")
    print(f"📄 Articles checked: {results['total_articles']}")
    print(f"🖼️  Total images: {results['total_images']}")
    print(f"✅ Working images: {results['working_images']}")
    print(f"❌ Broken images: {results['broken_images']}")
    
    if results['broken_images'] > 0:
        print(f"\n🔧 BROKEN IMAGES FOUND:")
        for article_path, article_data in results['articles'].items():
            if article_data['broken_count'] > 0:
                print(f"  📄 {Path(article_path).name}: {article_data['broken_count']} broken")
                for img in article_data['images']:
                    if not img['working']:
                        print(f"     ❌ [{img['type']}] {img['url']}")
    else:
        print(f"\n🎉 All images are working!")
    
    print(f"\nResults saved to: comprehensive_audit_results.json")