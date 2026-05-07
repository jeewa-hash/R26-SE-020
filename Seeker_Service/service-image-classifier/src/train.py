import os
from data_loader import get_data_generators
from model_builder import build_repair_model
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping

def main():
    # 1. Path Setup
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE_DIR, 'data', 'processed')
    MODEL_SAVE_PATH = os.path.join(BASE_DIR, 'models', 'repair_model_v1.h5')

    # 2. Load Data
    print("--- Loading Data ---")
    train_gen, val_gen = get_data_generators(DATA_DIR)

    # 3. Build Model
    print("--- Building Model ---")
    model = build_repair_model(num_classes=3)

    # 4. Define Callbacks
    # Stop training if validation loss doesn't improve for 3 epochs
    early_stop = EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)
    
    # Save the best version of the model
    checkpoint = ModelCheckpoint(MODEL_SAVE_PATH, monitor='val_accuracy', save_best_only=True, mode='max')

    # 5. Start Training
    print("--- Starting Training ---")
    history = model.fit(
        train_gen,
        epochs=15,  # You can increase this if you have a lot of data
        validation_data=val_gen,
        callbacks=[early_stop, checkpoint]
    )

    print(f"--- Training Complete! Model saved to {MODEL_SAVE_PATH} ---")

if __name__ == "__main__":
    main()