import sys
import os
import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image

# Matches flow_from_directory order (alphabetical folder names under train/val)
CATEGORIES = ["electrical", "furniture", "other", "plumbing"]


def predict_repair_category(img_path, model_path):
    model = tf.keras.models.load_model(model_path, compile=False)

    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array /= 255.0

    predictions = model.predict(img_array, verbose=0)
    result_index = int(np.argmax(predictions[0]))
    confidence = float(predictions[0][result_index])

    return CATEGORIES[result_index], confidence


def find_default_sample_image(base_dir):
    val_dir = os.path.join(base_dir, "data", "processed", "val")
    if not os.path.isdir(val_dir):
        return None
    for root, _, files in os.walk(val_dir):
        for name in sorted(files):
            if name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                return os.path.join(root, name)
    return None


if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(current_dir)
    model_path = os.path.join(base_dir, "models", "repair_model_v1.h5")

    if len(sys.argv) > 1:
        test_image = os.path.abspath(sys.argv[1])
    else:
        test_image = find_default_sample_image(base_dir)

    if not test_image or not os.path.isfile(test_image):
        print("Usage: python predict.py [path/to/image.jpg]")
        print("No image found. Pass a file path or add images under data/processed/val/.")
        sys.exit(1)

    if not os.path.isfile(model_path):
        print(f"Error: Model not found at {model_path}")
        sys.exit(1)

    label, conf = predict_repair_category(test_image, model_path)
    print()
    print("=" * 20)
    print("   DETECTION RESULT   ")
    print("=" * 20)
    print(f"Image:      {test_image}")
    print(f"Category:   {label}")
    print(f"Confidence: {conf * 100:.2f}%")
    print("=" * 20)
