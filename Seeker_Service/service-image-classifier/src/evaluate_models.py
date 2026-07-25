import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, classification_report
from data_loader import get_data_generators
import tensorflow as tf
import os

def evaluate():
    # Setup Paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE_DIR, 'data', 'processed')
    MODEL_PATH = os.path.join(BASE_DIR, 'models', 'repair_model_v1.h5')
    RESULTS_DIR = os.path.join(BASE_DIR, 'results')

    # Fix 1: Ensure the results directory exists before saving
    if not os.path.exists(RESULTS_DIR):
        os.makedirs(RESULTS_DIR)
        print(f"Created directory: {RESULTS_DIR}")

    # 1. Load Data & Model
    # Note: Ensure shuffle=False in your data_loader's val_gen or the report will be wrong
    print("--- Loading Data and Model ---")
    _, val_gen = get_data_generators(DATA_DIR)
    
    # Load model and handle the warning about compiled metrics
    model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

    # 2. Get Predictions
    print("--- Generating predictions for validation set ---")
    # Reset validation generator to ensure it starts from the first image
    val_gen.reset()
    
    Y_pred = model.predict(val_gen)
    y_pred = np.argmax(Y_pred, axis=1)
    
    # 3. Plot Confusion Matrix
    print("--- Creating Confusion Matrix ---")
    cm = confusion_matrix(val_gen.classes, y_pred)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=val_gen.class_indices.keys(), 
                yticklabels=val_gen.class_indices.keys())
    plt.title('Repair Service Classification - Confusion Matrix')
    plt.ylabel('Actual Category')
    plt.xlabel('Predicted Category')
    
    # Save the plot
    save_path = os.path.join(RESULTS_DIR, 'confusion_matrix.png')
    plt.savefig(save_path)
    plt.close() # Close plot to free up memory
    print(f"Confusion matrix saved to: {save_path}")
    
    # 4. Print Report
    print("\n" + "="*30)
    print("CLASSIFICATION REPORT")
    print("="*30)
    print(classification_report(val_gen.classes, y_pred, target_names=val_gen.class_indices.keys()))

if __name__ == "__main__":
    evaluate()