#!/usr/bin/env python3
import frontmatter
import subprocess
import concurrent.futures
from pathlib import Path
import time

def check_url_status(url):
    """Check if URL returns HTTP 200 status"""
    try:
        result = subprocess.run(['curl', '-sI', '--max-time', '5', url], capture_output=True, text=True, timeout=10)
        if result.stdout:
            first_line = result.stdout.split('\n')[0]
            if '200 OK' in first_line or '200' in first_line:
                return url, True, first_line.strip()
            else:
                return url, False, first_line.strip()
        return url, False, "No response"
    except Exception as e:
        return url, False, str(e)

def extract_all_featured_images():
    """Extract all featured_image and heroImage URLs"""
    blog_dir = Path('src/content/blog')
    urls = []
    
    for mdx_file in blog_dir.glob('*.mdx'):
        try:
            with open(mdx_file, 'r', encoding='utf-8') as f:
                post = frontmatter.load(f)
            
            # Check for featured_image
            if 'featured_image' in post.metadata and post.metadata['featured_image']:
                urls.append((mdx_file.name, post.metadata['featured_image']))
            
            # Check for heroImage
            elif 'heroImage' in post.metadata and post.metadata['heroImage']:
                urls.append((mdx_file.name, post.metadata['heroImage']))
        
        except Exception as e:
            print(f"Error processing {mdx_file}: {e}")
    
    return urls

def main():
    print("Extracting all image URLs...")
    file_urls = extract_all_featured_images()
    
    if not file_urls:
        print("No image URLs found!")
        return
    
    print(f"Found {len(file_urls)} image URLs to check")
    print("Checking URLs in parallel...")
    
    # Extract just the URLs for checking
    urls = [url for _, url in file_urls]
    
    broken_count = 0
    working_count = 0
    
    # Use ThreadPoolExecutor for parallel checking
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_url = {executor.submit(check_url_status, url): url for url in urls}
        
        for i, future in enumerate(concurrent.futures.as_completed(future_to_url)):
            url, is_working, status = future.result()
            
            # Find the filename for this URL
            filename = next((fname for fname, furl in file_urls if furl == url), "unknown")
            
            if is_working:
                print(f"✅ {filename}: OK")
                working_count += 1
            else:
                print(f"❌ {filename}: BROKEN - {status}")
                print(f"   URL: {url}")
                broken_count += 1
            
            # Progress indicator
            if (i + 1) % 10 == 0:
                print(f"   Progress: {i + 1}/{len(urls)} checked...")
    
    print(f"\n{'='*60}")
    print(f"BATCH URL CHECK COMPLETE")
    print(f"{'='*60}")
    print(f"🖼️  URLs checked: {len(urls)}")
    print(f"✅ Working: {working_count}")
    print(f"❌ Broken: {broken_count}")

if __name__ == "__main__":
    import os
    os.chdir('/Users/kylereierson/code/birdie-report')
    main()