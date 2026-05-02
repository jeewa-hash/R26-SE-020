import os
import tensorflow as tf
import json

base_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(base_dir, "../models/service_model.h5")
indices_path = os.path.join(base_dir, "../models/class_indices.json")

print(f"Checking paths from: {base_dir}")
print(f"Model exists: {os.path.exists(model_path)} ({model_path})")
print(f"Indices exist: {os.path.exists(indices_path)} ({indices_path})")

if os.path.exists(model_path):
    print("Attempting to load model (this may take a minute)...")
    try:
        model = tf.keras.models.load_model(model_path)
        print("✅ Model loaded successfully!")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
else:
    print("❌ Model file not found!")
