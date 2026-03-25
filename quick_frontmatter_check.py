#!/usr/bin/env python3
import frontmatter
import subprocess
import time
from pathlib import Path

def run_curl_check(url):
    """Check if URL returns HTTP 200 status"""
    try:
        result = subprocess.run(['curl', '-sI', url], capture_output=True, text=True, timeout=10)
        if result.stdout:
            first_line = result.stdout.split('\n')[0]
            if '200 OK' in first_line or '200' in first_line:
                return True
        return False
    except Exception as e:
        print(f"Error checking {url}: {e}")
        return False

def check_frontmatter_images():
    """Quick check of just frontmatter images"""
    blog_dir = Path('src/content/blog')
    
    total_files = 0
    total_images = 0
    broken_images = 0
    broken_files = []
    
    print("Checking frontmatter images...")
    
    for mdx_file in sorted(blog_dir.glob('*.mdx')):
        total_files += 1
        
        try:
            with open(mdx_file, 'r', encoding='utf-8') as f:
                post = frontmatter.load(f)
            
            # Check for featured_image
            if 'featured_image' in post.metadata and post.metadata['featured_image']:
                url = post.metadata['featured_image']
                total_images += 1
                print(f"{mdx_file.name}: {url}")
                
                is_working = run_curl_check(url)
                if is_working:
                    print(f"  ✅ WORKING")
                else:
                    print(f"  ❌ BROKEN")
                    broken_images += 1
                    broken_files.append((mdx_file.name, url))
                
                time.sleep(0.1)  # Be nice to servers
            
            # Check for heroImage
            elif 'heroImage' in post.metadata and post.metadata['heroImage']:
                url = post.metadata['heroImage']
                total_images += 1
                print(f"{mdx_file.name}: {url}")
                
                is_working = run_curl_check(url)
                if is_working:
                    print(f"  ✅ WORKING")
                else:
                    print(f"  ❌ BROKEN")
                    broken_images += 1
                    broken_files.append((mdx_file.name, url))
                
                time.sleep(0.1)
            
            else:
                print(f"{mdx_file.name}: No frontmatter image found")
        
        except Exception as e:
            print(f"Error processing {mdx_file}: {e}")
    
    print(f"\n{'='*60}")
    print(f"FRONTMATTER IMAGE CHECK COMPLETE")
    print(f"{'='*60}")
    print(f"📄 Files checked: {total_files}")
    print(f"🖼️  Images found: {total_images}")
    print(f"❌ Broken images: {broken_images}")
    
    if broken_files:
        print(f"\n🔧 BROKEN IMAGES:")
        for filename, url in broken_files:
            print(f"  {filename}: {url}")
    else:
        print(f"\n🎉 All frontmatter images working!")

if __name__ == "__main__":
    import os
    os.chdir('/Users/kylereierson/code/birdie-report')
    check_frontmatter_images()