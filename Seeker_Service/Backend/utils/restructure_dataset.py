import os
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "..", "dataset")
SOURCE_SPLITS = ["training", "validation"]
TARGET_SPLITS = {"training": "train", "validation": "val"}

CATEGORY_MAP = {
    "electrical": [
        "fan_",
        "fridge_",
        "kitchen_",
        "lighting_",
        "tv_",
        "washing_machine_",
        "Electrical_Repair",
    ],
    "plumbing": [
        "plumbing_",
        "Plumbing",
    ],
    "furniture": [
        "furniture_",
        "Furniture_Repair",
    ]
}

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp")


def find_category(folder_name):
    for category, prefixes in CATEGORY_MAP.items():
        for prefix in prefixes:
            if folder_name == prefix or folder_name.startswith(prefix):
                return category
    return None


def ensure_target_folders():
    for target_split in TARGET_SPLITS.values():
        target_root = os.path.join(DATASET_DIR, target_split)
        for category in CATEGORY_MAP.keys():
            os.makedirs(os.path.join(target_root, category), exist_ok=True)


def copy_images(source_root, target_root, split_name):
    copied = 0
    skipped = 0
    renamed = 0

    for folder_name in sorted(os.listdir(source_root)):
        source_folder = os.path.join(source_root, folder_name)
        if not os.path.isdir(source_folder):
            continue

        category = find_category(folder_name)
        if category is None:
            print(f"Skipping unknown folder: {folder_name}")
            skipped += 1
            continue

        dest_folder = os.path.join(target_root, category)
        os.makedirs(dest_folder, exist_ok=True)

        for filename in sorted(os.listdir(source_folder)):
            if not filename.lower().endswith(IMAGE_EXTENSIONS):
                continue

            source_path = os.path.join(source_folder, filename)
            dest_filename = f"{folder_name}_{filename}"
            dest_path = os.path.join(dest_folder, dest_filename)
            count = 1
            while os.path.exists(dest_path):
                renamed += 1
                dest_filename = f"{folder_name}_{count}_{filename}"
                dest_path = os.path.join(dest_folder, dest_filename)
                count += 1
            shutil.copy2(source_path, dest_path)
            copied += 1

    print(f"{split_name}: copied {copied} images, skipped {skipped} folders, renamed {renamed} duplicate files.")
    return copied, skipped, renamed


def main():
    ensure_target_folders()

    total_copied = 0
    total_skipped = 0
    total_renamed = 0

    for source_split in SOURCE_SPLITS:
        source_root = os.path.join(DATASET_DIR, source_split)
        target_root = os.path.join(DATASET_DIR, TARGET_SPLITS[source_split])

        if not os.path.isdir(source_root):
            print(f"Source folder missing: {source_root}")
            continue

        copied, skipped, renamed = copy_images(source_root, target_root, source_split)
        total_copied += copied
        total_skipped += skipped
        total_renamed += renamed

    print("\nReorganization finished.")
    print(f"Total copied: {total_copied}")
    print(f"Total skipped folders: {total_skipped}")
    print(f"Total renamed duplicates: {total_renamed}")


if __name__ == "__main__":
    main()
