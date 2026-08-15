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

    # 3. Build Model - UPDATED TO 4 CLASSES
    print("--- Building Model ---")
    model = build_repair_model(num_classes=4) 

    # 4. Define Callbacks
    early_stop = EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)
    checkpoint = ModelCheckpoint(MODEL_SAVE_PATH, monitor='val_accuracy', save_best_only=True, mode='max')

    # 5. Start Training
    print("--- Starting Training ---")
    history = model.fit(
        train_gen,
<<<<<<< HEAD
        epochs=15,
=======
        epochs=15,  # You can increase this if you have a lot of data
>>>>>>> 86c75e8e2fcb6e9227950833bbbe0f971d14ce70
        validation_data=val_gen,
        callbacks=[early_stop, checkpoint]
    )

    print(f"--- Training Complete! Model saved to {MODEL_SAVE_PATH} ---")

if __name__ == "__main__":
    main()