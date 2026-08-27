"""
collect_dataset.py
Downloads YouTube videos and extracts frames as dataset images.
- Skips classes that already have 100+ images
- Never overwrites existing images (finds next free index)

Usage:
    python collect_dataset.py

Place this file at:
    Provider_Service/
    ├── collect_dataset.py   ← this file
    ├── dataset/
    └── ML_Engine/
"""

import os
import cv2
import yt_dlp
from urllib.parse import urlparse, urlunparse

# ─── Config ───────────────────────────────────────────────────────────────────

DATASET_DIR    = r"E:\4th year\semester 1\Research\R26-SE-020\Provider_Service\dataset"
FRAME_INTERVAL = 75  
MAX_FRAMES     = 10  # Max frames to extract per video
IMG_SIZE       = (224, 224)

# ─── Your YouTube / Facebook Video Links ──────────────────────────────────────

VIDEOS = {
    "electrical_repair": [
        "https://youtu.be/g0a4n_ndInA?si=boDFg4uFwHX14-gd",
        "https://youtube.com/shorts/InHJ4nh1wsc?si=ZzhCT1hj-Lqmj9g_",
        "https://www.facebook.com/share/r/1BqXzCBegY/",
        "https://www.facebook.com/share/r/1DBsbmMLqm/",
        "https://www.facebook.com/share/v/1Em61DKU4o/",
        "https://www.facebook.com/share/v/1ca29EvRqM/",
        "https://www.facebook.com/reel/1594082328716333/",
        "https://www.facebook.com/share/v/19Nq8puTyR/",
        "https://www.facebook.com/share/v/19JxUSpGvK/",
        "https://www.facebook.com/share/v/19Y937e3cs/",
        "https://www.facebook.com/share/v/1EkW4rykLM/",
        "https://www.facebook.com/reel/1623100539443023",
        "https://www.facebook.com/share/v/1EoiyqhjVF/",
        "https://www.facebook.com/share/v/19F5XHkEuC/",
    ],

    "plumbing_repair": [
        "https://www.facebook.com/share/v/14pK8apSC7C/",
        "https://www.facebook.com/share/r/1FCeqCT7B4/",
        "https://www.facebook.com/reel/1317846663835889/",
        "https://www.facebook.com/share/r/1FihpPpA25/",
        "https://www.facebook.com/reel/2235850213859847/",
        "https://www.facebook.com/reel/1033882555753683/",
    ],

    "furniture_repair": [
        
    ],

    "roofing_repair": [
        
    ],

    "painting_renovation": [
        
    ],

    "house_cleaning": [
        
    ],

    "post_construction_cleaning": [
        
    ],

    "move_in_out_cleaning": [
        
    ],

    "sofa_carpet_curtain_cleaning": [
        
    ],

    "garden_cleaning": [
       
    ],

    "garden_maintenance": [
       
    ],

    "landscaping_design": [
        
    ],

    "planting": [
        
    ],
}

# ─── Core Functions ───────────────────────────────────────────────────────────


def clean_facebook_url(url: str) -> str:
    """Removes tracking query parameters from FB share links."""
    parsed = urlparse(url)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, '', '', ''))


def download_video(url: str, output_path: str) -> str:
    """Downloads YouTube and Facebook videos using native Python yt-dlp."""
    print(f"  Downloading: {url}")
    
    if "facebook.com" in url or "fb.watch" in url:
        url = clean_facebook_url(url)

    ydl_opts = {
        'format': 'best[height<=480]/bestvideo[height<=480]+bestaudio/best',
        'outtmpl': output_path,
        'quiet': True,
        'no_warnings': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'http_headers': {
            'Accept-Language': 'en-US,en;q=0.9',
            'Sec-Fetch-Mode': 'navigate',
        },
        'max_retries': 3,
        'fragment_retries': 3,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return output_path
    except Exception as e:
        print(f"  ❌ Download failed for {url}: {e}")
        return None


def get_existing_files(class_name: str) -> set:
    """Return set of all existing filenames in a class folder."""
    class_dir = os.path.join(DATASET_DIR, class_name)
    if not os.path.exists(class_dir):
        return set()
    return set(os.listdir(class_dir))


def get_next_index(existing_files: set, class_name: str) -> int:
    """Scan existing filenames and return max index + 1."""
    max_index = 0
    prefix = f"{class_name}_"
    for filename in existing_files:
        name = os.path.splitext(filename)[0]
        if name.startswith(prefix):
            try:
                # Extract number part regardless of vidX prefix
                num_part = name.split('_')[-1]
                index = int(num_part)
                if index > max_index:
                    max_index = index
            except ValueError:
                continue
    return max_index + 1


def center_crop_and_resize(img, target_size=(224, 224)):
    """Crops the center of the image to preserve aspect ratio before resizing."""
    h, w = img.shape[:2]
    min_dim = min(h, w)
    start_x = (w - min_dim) // 2
    start_y = (h - min_dim) // 2
    cropped = img[start_y:start_y + min_dim, start_x:start_x + min_dim]
    return cv2.resize(cropped, target_size)


def extract_frames(video_path: str, class_name: str, video_id: int, existing_files: set) -> int:
    """Extract frames from a video, preserving aspect ratio and preventing overlaps."""
    class_dir = os.path.join(DATASET_DIR, class_name)
    os.makedirs(class_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"  ❌ Could not open video: {video_path}")
        return 0

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS)
    print(f"  Video: {total_frames} frames at {fps:.1f}fps")

    img_index   = get_next_index(existing_files, class_name)
    frame_count = 0
    saved_count = 0

    while saved_count < MAX_FRAMES:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % FRAME_INTERVAL == 0:
            resized = center_crop_and_resize(frame, IMG_SIZE)

            # Skip very dark or very bright frames
            gray       = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
            brightness = gray.mean()
            if brightness < 30 or brightness > 240:
                frame_count += 1
                continue

            # Skip blurry frames
            if cv2.Laplacian(gray, cv2.CV_64F).var() < 50:
                frame_count += 1
                continue

            # Find a filename that does NOT already exist
            while True:
                filename = f"{class_name}_vid{video_id}_{img_index:04d}.jpg"
                if filename not in existing_files:
                    break
                img_index += 1

            save_path = os.path.join(class_dir, filename)
            cv2.imwrite(save_path, resized, [cv2.IMWRITE_JPEG_QUALITY, 90])

            existing_files.add(filename)
            saved_count += 1
            img_index   += 1

        frame_count += 1

    cap.release()
    return saved_count


def get_existing_count(class_name: str) -> int:
    """Count existing images in a class folder."""
    class_dir = os.path.join(DATASET_DIR, class_name)
    if not os.path.exists(class_dir):
        return 0
    return len([
        f for f in os.listdir(class_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    ])


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("YouTube Dataset Collector")
    print("=" * 60)

    temp_dir = os.path.join(DATASET_DIR, "_temp_videos")
    os.makedirs(temp_dir, exist_ok=True)

    total_saved = 0

    for class_name, urls in VIDEOS.items():
        print(f"\n{'─' * 50}")
        print(f"Class: {class_name}")

        existing_count = get_existing_count(class_name)
        print(f"Existing images: {existing_count}")

        if existing_count >= 100:
            print(f"  ✅ Already has {existing_count} images — skipping")
            continue

        existing_files = get_existing_files(class_name)
        class_saved    = 0

        for i, url in enumerate(urls):
            if "REPLACE_WITH_REAL_URL" in url:
                print(f"  ⚠️  Skipping placeholder URL")
                continue

            print(f"\n  Video {i + 1}/{len(urls)}")

            video_path = os.path.join(temp_dir, f"{class_name}_{i}.mp4")
            result     = download_video(url, video_path)
            if result is None:
                continue

            # Pass i (video_id) into extract_frames
            saved = extract_frames(video_path, class_name, i + 1, existing_files)
            class_saved += saved
            print(f"  ✅ Extracted {saved} frames")

            if os.path.exists(video_path):
                os.remove(video_path)

        print(f"Total for {class_name}: {existing_count + class_saved} images (+{class_saved} new)")
        total_saved += class_saved

    try:
        os.rmdir(temp_dir)
    except Exception:
        pass

    print(f"\n{'=' * 60}")
    print(f"✅ Done! Total new frames extracted: {total_saved}")
    print(f"\nDataset summary:")
    for class_name in VIDEOS.keys():
        count  = get_existing_count(class_name)
        status = "✅" if count >= 100 else "⚠️ " if count >= 50 else "❌" 
        print(f"  {status} {class_name:<35} {count} images")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()