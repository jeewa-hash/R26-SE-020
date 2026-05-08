"""
Service Image Classifier — MobileNetV2 Transfer Learning
Trains a 9-class service recognition model for local service providers.
"""

import os
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras import layers, models, callbacks
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import matplotlib.pyplot as plt

# ─── Config ────────────────────────────────────────────────────────────────────

IMG_SIZE    = (224, 224)
BATCH_SIZE  = 32
EPOCHS_HEAD = 10      # Train only the new head first
EPOCHS_FINE = 5       # Fine-tune last few MobileNet layers
LEARNING_RATE = 1e-3
FINE_LR       = 1e-5
DATA_DIR = r"E:\4th year\semester 1\Research\R26-SE-020\Provider_Service\dataset"
MODEL_DIR   = "./saved"
os.makedirs(MODEL_DIR, exist_ok=True)

CLASS_NAMES = [
    "electrical_repair",
    "plumbing_repair",
    "furniture_repair",
    "roofing_repair",
    "painting_renovation",
    "house_cleaning",
    "post_construction_cleaning",
    "move_in_out_cleaning",
    "sofa_carpet_curtain_cleaning",
    "garden_cleaning",  
]

CATEGORY_MAP = {
    "electrical_repair":          {"category": "repairing", "label": "Electrical Repair"},
    "plumbing_repair":            {"category": "repairing", "label": "Plumbing Repair"},
    "furniture_repair":           {"category": "repairing", "label": "Furniture Repair"},
    "roofing_repair":             {"category": "repairing", "label": "Roofing Repair"},
    "painting_renovation":        {"category": "repairing", "label": "Painting & Renovation"},
    "house_cleaning":             {"category": "cleaning",  "label": "House Cleaning"},
    "post_construction_cleaning": {"category": "cleaning",  "label": "Post-Construction Cleaning"},
    "move_in_out_cleaning":       {"category": "cleaning",  "label": "Move In/Out Cleaning"},
    "sofa_carpet_curtain_cleaning":{"category": "cleaning", "label": "Sofa/Carpet/Curtain Cleaning"},
    "garden_cleaning": {"category": "cleaning", "label": "Garden Cleaning"},
}

# ─── Data Augmentation ──────────────────────────────────────────────────────────

train_datagen = ImageDataGenerator(
    rescale=1.0 / 255,
    rotation_range=20,
    width_shift_range=0.15,
    height_shift_range=0.15,
    shear_range=0.1,
    zoom_range=0.2,
    horizontal_flip=True,
    brightness_range=[0.8, 1.2],
    validation_split=0.2,
)

val_datagen = ImageDataGenerator(
    rescale=1.0 / 255,
    validation_split=0.2,
)


def load_data():
    train_data = train_datagen.flow_from_directory(
        DATA_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="sparse",
        subset="training",
        shuffle=True,
        classes=CLASS_NAMES,
    )
    val_data = val_datagen.flow_from_directory(
        DATA_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="sparse",
        subset="validation",
        shuffle=False,
        classes=CLASS_NAMES,
    )
    return train_data, val_data


# ─── Model Architecture ─────────────────────────────────────────────────────────

def build_model(num_classes: int = 9):
    base_model = MobileNetV2(
        input_shape=(*IMG_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False  # Freeze backbone initially

    inputs = tf.keras.Input(shape=(*IMG_SIZE, 3))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    return model, base_model


# ─── Training ───────────────────────────────────────────────────────────────────

def train():
    print("Loading data...")
    train_data, val_data = load_data()

    print("Building model...")
    model, base_model = build_model(num_classes=len(CLASS_NAMES))

    model.compile(
        optimizer=tf.keras.optimizers.Adam(LEARNING_RATE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.summary()

    # Callbacks
    cb = [
        callbacks.ModelCheckpoint(
            f"{MODEL_DIR}/best_model.h5",
            save_best_only=True,
            monitor="val_accuracy",
            verbose=1,
        ),
        callbacks.EarlyStopping(patience=5, restore_best_weights=True),
        callbacks.ReduceLROnPlateau(factor=0.5, patience=3, verbose=1),
    ]

    # Phase 1: Train head only
    print("\n=== Phase 1: Training classifier head ===")
    history1 = model.fit(
        train_data,
        validation_data=val_data,
        epochs=EPOCHS_HEAD,
        callbacks=cb,
    )

    # Phase 2: Fine-tune last 30 layers of MobileNetV2
    print("\n=== Phase 2: Fine-tuning backbone ===")
    base_model.trainable = True
    for layer in base_model.layers[:-30]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(FINE_LR),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    history2 = model.fit(
        train_data,
        validation_data=val_data,
        epochs=EPOCHS_FINE,
        callbacks=cb,
    )

    # Evaluate
    loss, acc = model.evaluate(val_data)
    print(f"\nFinal Validation Accuracy: {acc:.4f}")
    print(f"Final Validation Loss:     {loss:.4f}")

    # Save final model + metadata
    model.save(f"{MODEL_DIR}/service_classifier.h5")
    with open(f"{MODEL_DIR}/class_names.json", "w") as f:
        json.dump(CLASS_NAMES, f, indent=2)
    with open(f"{MODEL_DIR}/category_map.json", "w") as f:
        json.dump(CATEGORY_MAP, f, indent=2)

    print(f"\nModel saved to {MODEL_DIR}/")

    # Plot training curves
    _plot_history(history1, history2)

    return model


def _plot_history(h1, h2):
    acc  = h1.history["accuracy"]      + h2.history["accuracy"]
    val  = h1.history["val_accuracy"]  + h2.history["val_accuracy"]
    epochs = range(1, len(acc) + 1)

    plt.figure(figsize=(10, 4))
    plt.subplot(1, 2, 1)
    plt.plot(epochs, acc,  label="Train")
    plt.plot(epochs, val,  label="Val")
    plt.axvline(x=len(h1.history["accuracy"]), color="gray", linestyle="--", label="Fine-tune start")
    plt.title("Accuracy")
    plt.legend()

    loss1 = h1.history["loss"]      + h2.history["loss"]
    vloss = h1.history["val_loss"]  + h2.history["val_loss"]
    plt.subplot(1, 2, 2)
    plt.plot(epochs, loss1, label="Train")
    plt.plot(epochs, vloss, label="Val")
    plt.axvline(x=len(h1.history["loss"]), color="gray", linestyle="--")
    plt.title("Loss")
    plt.legend()

    plt.tight_layout()
    plt.savefig(f"{MODEL_DIR}/training_curves.png", dpi=120)
    print("Training curves saved.")


if __name__ == "__main__":
    train()