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
import subprocess

# ─── Config ───────────────────────────────────────────────────────────────────

DATASET_DIR    = r"E:\4th year\semester 1\Research\R26-SE-020\Provider_Service\dataset"
FRAME_INTERVAL = 30      # Extract 1 frame every 30 frames (~1 per second at 30fps)
MAX_FRAMES     = 150     # Max frames to extract per video
IMG_SIZE       = (224, 224)

# ─── Your YouTube Video Links ─────────────────────────────────────────────────

VIDEOS = {

    "electrical_repair": [
        "https://youtube.com/shorts/527A7JMDI5E?si=AwCVZfACX2DkzuJ1",
        "https://youtube.com/shorts/qCVxqBZvM_U?si=owT4VXShHIWqQm5l",
        "https://youtube.com/shorts/qaTGAeUlvv8?si=jM-xKr0JfaZDKHF6",
        "https://youtube.com/shorts/j1SLh0dJsDo?si=TmSaP9rrkIhc2vLU",
        "https://youtube.com/shorts/BsDdQK3dDMs?si=WSgM8h7EC2r0Fl1x",
        "https://youtube.com/shorts/IWOsaZ2By9g?si=RZN4GLQlZM_XL3Ws",
    ],

    "plumbing_repair": [
        "https://youtube.com/shorts/3tiJ9dP2KtA?si=FvbLxDpkQmZnRfG7",
        "https://youtube.com/shorts/tyk_cGxp3UI?si=__T9NQVyW_1QebMe",
        "https://youtube.com/shorts/UV0kenv8yWA?si=toMpcXLrYBGKFlln",
        "https://youtube.com/shorts/D6Qa_Izp3lA?si=5JlTUkyz_Qb_LBhb",
        "https://youtube.com/shorts/e-Gvh3J-NW0?si=mZkiwskpIt6bsYOf",
        "https://youtube.com/shorts/7D8sTcncsDE?si=2qRfFaohenjBmpky",
    ],

    "furniture_repair": [
        "https://youtube.com/shorts/_V5L6Fs1sBI?si=Epq3inc47f6zK4Uh",
        "https://youtube.com/shorts/aBkcc7jmGwI?si=-6i7QetORAaB5n2l",
        "https://youtube.com/shorts/EG1H5R27b6o?si=f3IQ-fkeUpL0Gqkz",
        "https://youtube.com/shorts/QgeuDMoM5T0?si=zPi13l0YiJID-CIM",
        "https://youtube.com/shorts/0Jd312CE3y4?si=sGSPMFsKmicvLiYM",
        "https://youtube.com/shorts/bB0R7WudEdk?si=kyVz7xB5XYqIY1vR",
    ],

    "roofing_repair": [
        "https://youtube.com/shorts/yAZyuFizmeQ?si=o4FEWbOpOqUv9vcV",
        "https://youtube.com/shorts/ah6RUbi-0PU?si=eseyG6QyA8Ss5cxA",
        "https://youtube.com/shorts/oWuMlgmUp2k?si=qwHdZjEvXVFO6Fy1",
        "https://youtube.com/shorts/KZdlzRM2vow?si=9D5lhBBunHhmWSja",
    ],

    "painting_renovation": [
        "https://youtube.com/shorts/VzSDqHoq00w?si=OiE13dpKYTuCxTj5",
        "https://youtube.com/shorts/AEli_vNrOdU?si=ytvyNafmUCrFHPrO",
        "https://youtube.com/shorts/wYKYpIGSTII?si=mi8Yl3CbZKKid1Rz",
        "https://youtube.com/shorts/py5WwbFhVyQ?si=sBMW2wlCe3ikh9-s",
        "https://youtube.com/shorts/EZs1fzxXKu8?si=kuLyTEhLKldcAenL",
    ],

    "house_cleaning": [
        "https://youtu.be/FROaGN675us?si=QSEfO_7PsfAyzc9X",
        "https://youtu.be/S5qZVIyWElY?si=w5KRC8XkI5tsII74",
        "https://youtu.be/jNj92cg7GIw?si=od_d4JEnYuPb6Qkk",
        "https://youtu.be/16fzSfVFE8U?si=V9vVAYUcFqAJ9MO-",
    ],

    "post_construction_cleaning": [
        "https://youtube.com/shorts/T7RUId6EXzY?si=M8FtkB89crIckIw6",
        "https://youtube.com/shorts/NXmUqdmhkC4?si=vuzzmhtObCSAM2Xt",
        "https://youtube.com/shorts/2yh_xe41Vws?si=KLGYobWUPdOlqgXv",
        "https://youtube.com/shorts/92S5v4FDArg?si=g-H1OQ9Vf29ebioO",
        "https://youtube.com/shorts/FDla_6HNyI4?si=X7BTT4ZV3n0-5Aya",
    ],

    "move_in_out_cleaning": [
        "https://youtu.be/Jw5olIBE7ZE?si=vYZ340Z4x5yk9A9n",
        "https://youtu.be/zxdpDaRcFdQ?si=JJfARn7kKakQlvKI",
        "https://youtu.be/yDd4jIVNkDM?si=QX2-Yby5L856wEcv",
    ],

    "sofa_carpet_curtain_cleaning": [
        "https://youtube.com/shorts/QQg8t2mzigQ?si=IeRJ7lCNqdaYZWiQ",
        "https://youtube.com/shorts/uu6-sXaOQhg?si=EsrFczmp9KOW9IY8",
        "https://youtube.com/shorts/WotHVgGpMCo?si=X52xQMqVWNCp4iC2",
        "https://youtu.be/oscDVKlnSco?si=b70-ucyPFiRZIo8B",
        "https://youtu.be/uD4l952RMq0?si=egZFARbvn7zK6JCz",
    ],

    "garden_cleaning": [
        "https://youtube.com/shorts/D5rs1z7AHZs?si=hivzHL9okrzlXIO0",
        "https://youtube.com/shorts/R8-zJUdkdFc?si=9hy5qSUW4foAZKFh",
        "https://youtube.com/shorts/DnMRXX1zAls?si=oqWjnO5IneNpU6-N",
        "https://youtube.com/shorts/ovU2wVdE0SA?si=aO_tgFRc2-QvGNj5",
        "https://youtube.com/shorts/aJF_CKXNCcs?si=g_kFQk9bBs7xpECw",
        "https://youtube.com/shorts/lV6u107mr1s?si=71fc5x_Mnn6q_V_k",
        "https://youtube.com/shorts/etvv018hlCM?si=h6oUe64xdelN0Uf6",
    ],

    "garden_maintenance": [
        "https://youtube.com/shorts/9NWfAntuAiI?si=1bWDcG4DQWaA5klP",
        "https://youtube.com/shorts/3uQfeXv4UKI?si=5f1rkz5SQ7QB4qwr",
        "https://youtube.com/shorts/dKGPtR6V_GE?si=IxYMtv1O8tueKK7U",
        "https://youtube.com/shorts/UtwP7wMbs7Y?si=LZ012EpOoj006S5J",
        "https://youtube.com/shorts/ps9eCWbPBLg?si=0whhALOewx-dlEbD",
        "https://youtube.com/shorts/pLD-lWqqJ-c?si=Ps_0CKxbW3GGneWF",
        "https://youtube.com/shorts/vbXen8WvgvI?si=QyzXyOep9fV5PXjf",
    ],

    "landscaping_design": [
        "https://youtube.com/shorts/Y_UyZQsYJeA?si=brYuVpr44y-rEBrW",
        "https://youtube.com/shorts/hyK3w1iCAfk?si=F1WaMLIgnLalprod",
        "https://youtube.com/shorts/nPA8MP0gLgY?si=Nf_2np-FFJgeO7u3",
        "https://youtube.com/shorts/rACL9fdAJBQ?si=o_z7YUs_myYDi3fZ",
        "https://youtube.com/shorts/U9Zjg0TFv6c?si=iPvBB5Jn_QFzz2PL",
        "https://youtube.com/shorts/VGTuakVPmVU?si=0rtjLSFqJyqghtGz",
    ],

    "planting": [
        "https://youtube.com/shorts/AAo8PBmXi4M?si=qOr7qzOd9LdnfA6b",
        "https://youtube.com/shorts/OlodjsmaWZk?si=ch_MYLnZRcIIb11s",
        "https://youtube.com/shorts/4eMS0_sva8c?si=iGIFOINx_TR8YuiH",
        "https://youtube.com/shorts/WHGhHgHNmTw?si=dcc8Q4eVVH9EJohN",
    ],
}

# ─── Core Functions ───────────────────────────────────────────────────────────

def download_video(url: str, output_path: str) -> str:
    """Download a YouTube video using yt-dlp."""
    print(f"  Downloading: {url}")
    cmd = [
        "yt-dlp",
        "-f", "mp4/best[height<=480]",
        "-o", output_path,
        "--quiet",
        "--no-warnings",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ❌ Download failed: {result.stderr.strip()}")
        return None
    return output_path


def get_existing_files(class_name: str) -> set:
    """Return set of all existing filenames in a class folder."""
    class_dir = os.path.join(DATASET_DIR, class_name)
    if not os.path.exists(class_dir):
        return set()
    return set(os.listdir(class_dir))


def get_next_index(existing_files: set, class_name: str) -> int:
    """
    Scan existing filenames and return max index + 1.
    e.g. if electrical_repair_0042.jpg exists, returns 43.
    """
    max_index = 0
    prefix    = f"{class_name}_"
    for filename in existing_files:
        name = os.path.splitext(filename)[0]   # strip .jpg
        if name.startswith(prefix):
            try:
                index = int(name.replace(prefix, ""))
                if index > max_index:
                    max_index = index
            except ValueError:
                continue
    return max_index + 1


def extract_frames(video_path: str, class_name: str, existing_files: set) -> int:
    """
    Extract frames from a video, never overwriting existing files.
    existing_files is updated in-place so consecutive videos don't collide.
    Returns number of frames saved.
    """
    class_dir = os.path.join(DATASET_DIR, class_name)
    os.makedirs(class_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"  ❌ Could not open video: {video_path}")
        return 0

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS)
    print(f"  Video: {total_frames} frames at {fps:.1f}fps")

    # Start index safely above all existing files
    img_index   = get_next_index(existing_files, class_name)
    frame_count = 0
    saved_count = 0

    while saved_count < MAX_FRAMES:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % FRAME_INTERVAL == 0:
            resized = cv2.resize(frame, IMG_SIZE)

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
                filename = f"{class_name}_{img_index:04d}.jpg"
                if filename not in existing_files:
                    break
                img_index += 1   # keep incrementing until free slot found

            save_path = os.path.join(class_dir, filename)
            cv2.imwrite(save_path, resized, [cv2.IMWRITE_JPEG_QUALITY, 90])

            existing_files.add(filename)  # register so next frame won't collide
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

        # Skip classes that already have enough images
        if existing_count >= 100:
            print(f"  ✅ Already has {existing_count} images — skipping")
            continue

        # Load ALL existing filenames once — passed into every extract call
        # so no two videos in the same class can produce duplicate filenames
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

            saved = extract_frames(video_path, class_name, existing_files)
            class_saved += saved
            print(f"  ✅ Extracted {saved} frames")

            if os.path.exists(video_path):
                os.remove(video_path)

        print(f"Total for {class_name}: {existing_count + class_saved} images (+{class_saved} new)")
        total_saved += class_saved

    # Cleanup temp folder
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