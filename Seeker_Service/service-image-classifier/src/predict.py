import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image
import os

def predict_repair_category(img_path, model_path):
    # 1. Load the trained model
    model = tf.keras.models.load_model(model_path)
    
    # 2. Preprocess the image to match training format
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array /= 255.0  # Normalization

    # 3. Predict
    predictions = model.predict(img_array)
    categories = ['Electrical', 'Furniture', 'Plumbing']
    
    result_index = np.argmax(predictions[0])
    confidence = predictions[0][result_index]

    return categories[result_index], confidence

if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    MODEL_PATH = os.path.join(BASE_DIR, 'models', 'repair_model_v1.h5')
    
    # Path to an image you want to test
    # Example: Place a photo of a broken chair in your test folder
    TEST_IMAGE = os.path.join(BASE_DIR, 'data', 'processed', 'test', 'test_sample.jpg')

    if os.path.exists(TEST_IMAGE):
        label, conf = predict_repair_category(TEST_IMAGE, MODEL_PATH)
        print(f"\n--- Result ---")
        print(f"Predicted Category: {label}")
        print(f"Confidence Score: {conf*100:.2f}%")
    else:
        print(f"Error: Could not find image at {TEST_IMAGE}")