import os
import random
from PIL import Image, ImageEnhance

TARGET_COUNT = 700
DATASET_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dataset", "train")
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp")


def is_image_file(filename):
    return filename.lower().endswith(IMAGE_EXTENSIONS)


def augment_image(img):
    if img.mode != "RGB":
        img = img.convert("RGB")

    if random.random() < 0.5:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)

    if random.random() < 0.4:
        angle = random.uniform(-25, 25)
        img = img.rotate(angle, resample=Image.BICUBIC, expand=False)

    if random.random() < 0.4:
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(random.uniform(0.7, 1.3))

    if random.random() < 0.4:
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(random.uniform(0.8, 1.4))

    if random.random() < 0.4:
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(random.uniform(0.7, 1.4))

    return img


def ensure_folder_exists(folder_path):
    if not os.path.isdir(folder_path):
        os.makedirs(folder_path, exist_ok=True)


def generate_augmented_images():
    print(f"Dataset root: {DATASET_ROOT}")
    if not os.path.isdir(DATASET_ROOT):
        print("Dataset root not found.")
        return

    for category in sorted(os.listdir(DATASET_ROOT)):
        category_folder = os.path.join(DATASET_ROOT, category)
        if not os.path.isdir(category_folder):
            continue

        image_files = [f for f in sorted(os.listdir(category_folder)) if is_image_file(f)]
        if not image_files:
            print(f"No source images found in {category_folder}. Skipping.")
            continue

        current_count = len(image_files)
        print(f"{category}: {current_count} source images")

        existing_aug_indices = [int(f.replace(f"{category}_aug_", "").replace(".jpg", ""))
                                for f in image_files if f.startswith(f"{category}_aug_") and f.endswith(".jpg")]
        index = max(existing_aug_indices, default=0) + 1

        while current_count < TARGET_COUNT:
            source_filename = random.choice(image_files)
            source_path = os.path.join(category_folder, source_filename)

            try:
                with Image.open(source_path) as img:
                    img_aug = augment_image(img)
                    new_filename = f"{category}_aug_{index:04d}.jpg"
                    new_path = os.path.join(category_folder, new_filename)
                    img_aug.save(new_path, quality=90)
                    current_count += 1
                    index += 1
            except Exception as exc:
                print(f"Skipping corrupted or unsupported image {source_path}: {exc}")
                continue

        print(f"{category}: expanded to {current_count} images")


if __name__ == "__main__":
    generate_augmented_images()
