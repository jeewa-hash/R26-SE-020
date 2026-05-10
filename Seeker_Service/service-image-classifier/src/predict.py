import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image
import os

def predict_repair_category(img_path, model_path):
    # 1. Load the trained model
    # We use compile=False to speed up loading for inference
    model = tf.keras.models.load_model(model_path, compile=False)
    
    # 2. Preprocess the image
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array /= 255.0  # Normalization

    # 3. Predict
    predictions = model.predict(img_array)
    
    # CRITICAL: This list must match the order of your folders in data/train
    # Usually: ['Electrical', 'Furniture', 'Other', 'Plumbing'] 
    # Check your train_generator.class_indices to be 100% sure of the order.
    categories = ['Electrical', 'Furniture', 'Other', 'Plumbing']
    
    result_index = np.argmax(predictions[0])
    confidence = predictions[0][result_index]

    return categories[result_index], confidence

if __name__ == "__main__":
    # Setup paths relative to this file
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    BASE_DIR = os.path.dirname(CURRENT_DIR)
    
    # Change this to your new 4-class model path
    MODEL_PATH = os.path.join(BASE_DIR, 'models', 'efficientnet_repair_v1.h5')
    
    # Test Image path
    TEST_IMAGE = os.path.join(BASE_DIR, 'data', 'processed', 'test', 'test_sample.jpg')

    if os.path.exists(TEST_IMAGE):
        label, conf = predict_repair_category(TEST_IMAGE, MODEL_PATH)
        print(f"\n" + "="*20)
        print(f"   DETECTION RESULT   ")
        print(f"="*20)
        print(f"Category:   {label}")
        print(f"Confidence: {conf*100:.2f}%")
        print(f"="*20)
    else:
        print(f"Error: Could not find image at {TEST_IMAGE}")