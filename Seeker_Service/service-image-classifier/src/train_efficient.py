import os
import matplotlib.pyplot as plt 
from data_loader import get_data_generators
from efficient_builder import build_repair_model 
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping

def main():
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    BASE_DIR = os.path.dirname(CURRENT_DIR)
    DATA_DIR = os.path.join(BASE_DIR, 'data', 'processed')
    MODEL_SAVE_PATH = os.path.join(BASE_DIR, 'models', 'efficientnet_repair_v1.h5')
    
    results_dir = os.path.join(CURRENT_DIR, 'results')
    if not os.path.exists(results_dir):
        os.makedirs(results_dir)

    print("--- Loading Data ---")
    # Finds 4 classes: Electrical, Furniture, Plumbing, Other
    train_gen, val_gen = get_data_generators(DATA_DIR)

    print("--- Building EfficientNet-B0 ---")
    # FIX: Updated to 4 to match the data generator
    model = build_repair_model(num_classes=4) 

    # Monitor validation loss; restore best weights if it stops improving
    early_stop = EarlyStopping(monitor='val_loss', patience=4, restore_best_weights=True)
    checkpoint = ModelCheckpoint(MODEL_SAVE_PATH, monitor='val_accuracy', save_best_only=True, mode='max')

    print("--- Starting Benchmark Training ---")
    history = model.fit(
        train_gen,
        epochs=15,
        validation_data=val_gen,
        callbacks=[early_stop, checkpoint]
    )

    print("--- Generating Result Graph ---")
    plt.figure(figsize=(12, 5))

    # Plot Accuracy
    plt.subplot(1, 2, 1)
    plt.plot(history.history['accuracy'], label='Train Accuracy', color='blue')
    plt.plot(history.history['val_accuracy'], label='Val Accuracy', color='orange')
    plt.title('EfficientNet Accuracy')
    plt.legend()

    # Plot Loss
    plt.subplot(1, 2, 2)
    plt.plot(history.history['loss'], label='Train Loss', color='blue')
    plt.plot(history.history['val_loss'], label='Val Loss', color='orange')
    plt.title('EfficientNet Loss')
    plt.legend()

    plot_path = os.path.join(results_dir, 'efficientnet_results.png')
    plt.savefig(plot_path)
    print(f"--- Result PNG saved to: {plot_path} ---")

if __name__ == "__main__":
    main()