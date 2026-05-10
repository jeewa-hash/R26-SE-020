"""
Service Image Classifier — Updated with "other" class
Model:      EfficientNetB0
Training:   Two-phase (frozen head → fine-tune)
Extras:     Class weights, strong augmentation, confusion matrix,
            per-class accuracy report, early stopping
Classes:    14 service categories (13 services + "other" for irrelevant images)
"""

import os
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras import layers, callbacks
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

# ─── Config ───────────────────────────────────────────────────────────────────

IMG_SIZE      = (224, 224)
BATCH_SIZE    = 16
EPOCHS_HEAD   = 15
EPOCHS_FINE   = 10
LEARNING_RATE = 1e-3
FINE_LR       = 1e-5
DATA_DIR      = r"E:\4th year\semester 1\Research\R26-SE-020\Provider_Service\dataset"
MODEL_DIR     = "./saved"
os.makedirs(MODEL_DIR, exist_ok=True)

# ─── 14 Classes (13 services + "other") ──────────────────────────────────────

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
    "garden_maintenance",
    "landscaping_design",
    "planting",
    "other",                        # ← NEW: catches irrelevant images
]

NUM_CLASSES = len(CLASS_NAMES)      # 14

CATEGORY_MAP = {
    "electrical_repair":            {"category": "repairing",  "label": "Electrical Repair"},
    "plumbing_repair":              {"category": "repairing",  "label": "Plumbing Repair"},
    "furniture_repair":             {"category": "repairing",  "label": "Furniture Repair"},
    "roofing_repair":               {"category": "repairing",  "label": "Roofing Repair"},
    "painting_renovation":          {"category": "repairing",  "label": "Painting & Renovation"},
    "house_cleaning":               {"category": "cleaning",   "label": "House Cleaning"},
    "post_construction_cleaning":   {"category": "cleaning",   "label": "Post-Construction Cleaning"},
    "move_in_out_cleaning":         {"category": "cleaning",   "label": "Move In/Out Cleaning"},
    "sofa_carpet_curtain_cleaning": {"category": "cleaning",   "label": "Sofa/Carpet/Curtain Cleaning"},
    "garden_cleaning":              {"category": "gardening",  "label": "Garden Cleaning"},
    "garden_maintenance":           {"category": "gardening",  "label": "Garden Maintenance"},
    "landscaping_design":           {"category": "gardening",  "label": "Landscaping & Design"},
    "planting":                     {"category": "gardening",  "label": "Planting Services"},
    "other":                        {"category": "unknown",    "label": "Irrelevant Image"},  # ← NEW
}

# ─── Strong Data Augmentation ─────────────────────────────────────────────────

train_datagen = ImageDataGenerator(
    rotation_range=30,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.15,
    zoom_range=0.25,
    horizontal_flip=True,
    vertical_flip=False,
    brightness_range=[0.7, 1.3],
    fill_mode="nearest",
    validation_split=0.2,
)

val_datagen = ImageDataGenerator(
    validation_split=0.2,
)

# ─── Load Data ────────────────────────────────────────────────────────────────

def load_data():
    train_data = train_datagen.flow_from_directory(
        DATA_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="sparse",
        subset="training",
        shuffle=True,
        classes=CLASS_NAMES,
        seed=42,
    )
    val_data = val_datagen.flow_from_directory(
        DATA_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="sparse",
        subset="validation",
        shuffle=False,
        classes=CLASS_NAMES,
        seed=42,
    )

    print(f"\n{'─'*50}")
    print(f"Training   images : {train_data.samples}")
    print(f"Validation images : {val_data.samples}")
    print(f"Classes           : {NUM_CLASSES}")
    print(f"{'─'*50}\n")

    for cls, idx in train_data.class_indices.items():
        count  = np.sum(np.array(train_data.classes) == idx)
        status = "✅" if count >= 50 else "⚠️ " if count >= 20 else "❌"
        tag    = " ← irrelevant class" if cls == "other" else ""
        print(f"  {status} {cls:<35} {count} images{tag}")
    print()

    return train_data, val_data


# ─── Class Weights ────────────────────────────────────────────────────────────

def get_class_weights(train_data):
    classes = train_data.classes
    weights = compute_class_weight(
        class_weight="balanced",
        classes=np.unique(classes),
        y=classes,
    )
    class_weight_dict = dict(enumerate(weights))
    print("Class weights:")
    for idx, w in class_weight_dict.items():
        print(f"  {CLASS_NAMES[idx]:<35} {w:.3f}")
    print()
    return class_weight_dict


# ─── Model Architecture ───────────────────────────────────────────────────────

def build_model():
    base_model = EfficientNetB0(
        input_shape=(*IMG_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = tf.keras.Input(shape=(*IMG_SIZE, 3))
    x = tf.keras.applications.efficientnet.preprocess_input(inputs)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dense(512, activation="relu")(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(NUM_CLASSES, activation="softmax")(x)   # now 14 outputs

    model = tf.keras.Model(inputs, outputs)
    return model, base_model


# ─── Callbacks ────────────────────────────────────────────────────────────────

def get_callbacks(phase: int):
    return [
        callbacks.ModelCheckpoint(
            f"{MODEL_DIR}/best_model.keras",
            save_best_only=True,
            monitor="val_accuracy",
            verbose=1,
        ),
        callbacks.EarlyStopping(
            patience=5 if phase == 1 else 4,
            restore_best_weights=True,
            monitor="val_accuracy",
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
    ]


# ─── Training ─────────────────────────────────────────────────────────────────

def train():
    print("Loading data...")
    train_data, val_data = load_data()

    print("Computing class weights...")
    class_weights = get_class_weights(train_data)

    print("Building EfficientNetB0 model...")
    model, base_model = build_model()

    model.compile(
        optimizer=tf.keras.optimizers.Adam(LEARNING_RATE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.summary()

    # ── Phase 1: Train classifier head only ──────────────────────────────────
    print("\n" + "="*60)
    print("PHASE 1: Training classifier head (backbone frozen)")
    print("="*60)
    history1 = model.fit(
        train_data,
        validation_data=val_data,
        epochs=EPOCHS_HEAD,
        class_weight=class_weights,
        callbacks=get_callbacks(phase=1),
    )

    # ── Phase 2: Fine-tune last 40 layers ────────────────────────────────────
    print("\n" + "="*60)
    print("PHASE 2: Fine-tuning backbone (last 40 layers)")
    print("="*60)
    base_model.trainable = True
    for layer in base_model.layers[:-40]:
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
        class_weight=class_weights,
        callbacks=get_callbacks(phase=2),
    )

    # ── Final Evaluation ─────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("FINAL EVALUATION")
    print("="*60)
    loss, acc = model.evaluate(val_data, verbose=1)
    print(f"\nFinal Validation Accuracy : {acc*100:.2f}%")
    print(f"Final Validation Loss     : {loss:.4f}")

    _classification_report(model, val_data)

    # ── Save ─────────────────────────────────────────────────────────────────
    model.save(f"{MODEL_DIR}/service_classifier.keras")
    model.save(f"{MODEL_DIR}/service_classifier.h5")

    with open(f"{MODEL_DIR}/class_names.json", "w") as f:
        json.dump(CLASS_NAMES, f, indent=2)
    with open(f"{MODEL_DIR}/category_map.json", "w") as f:
        json.dump(CATEGORY_MAP, f, indent=2)

    metadata = {
        "model":          "EfficientNetB0",
        "num_classes":    NUM_CLASSES,
        "img_size":       IMG_SIZE,
        "final_accuracy": round(float(acc), 4),
        "final_loss":     round(float(loss), 4),
        "epochs_head":    EPOCHS_HEAD,
        "epochs_fine":    EPOCHS_FINE,
        "train_samples":  train_data.samples,
        "val_samples":    val_data.samples,
        "has_other_class": True,           # ← flag for predictor
    }
    with open(f"{MODEL_DIR}/training_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n✅ Model saved to {MODEL_DIR}/")
    print(f"   service_classifier.keras")
    print(f"   service_classifier.h5")
    print(f"   class_names.json")
    print(f"   category_map.json")
    print(f"   training_metadata.json")

    _plot_history(history1, history2)

    return model


# ─── Evaluation Helpers ───────────────────────────────────────────────────────

def _classification_report(model, val_data):
    val_data.reset()
    y_true = val_data.classes
    y_pred = np.argmax(model.predict(val_data, verbose=0), axis=1)

    print("\nPer-class Report:")
    print(classification_report(y_true, y_pred, target_names=CLASS_NAMES, zero_division=0))

    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(16, 12))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=CLASS_NAMES,
        yticklabels=CLASS_NAMES,
    )
    plt.title("Confusion Matrix (14 classes incl. other)")
    plt.ylabel("True Label")
    plt.xlabel("Predicted Label")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(f"{MODEL_DIR}/confusion_matrix.png", dpi=120)
    print(f"\nConfusion matrix saved to {MODEL_DIR}/confusion_matrix.png")


def _plot_history(h1, h2):
    acc   = h1.history["accuracy"]     + h2.history["accuracy"]
    val   = h1.history["val_accuracy"] + h2.history["val_accuracy"]
    loss1 = h1.history["loss"]         + h2.history["loss"]
    vloss = h1.history["val_loss"]     + h2.history["val_loss"]
    epochs = range(1, len(acc) + 1)
    split  = len(h1.history["accuracy"])

    plt.figure(figsize=(14, 5))

    plt.subplot(1, 2, 1)
    plt.plot(epochs, acc, label="Train Accuracy", color="royalblue")
    plt.plot(epochs, val, label="Val Accuracy",   color="orange")
    plt.axvline(x=split, color="gray", linestyle="--", label="Fine-tune start")
    plt.title("Accuracy")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.subplot(1, 2, 2)
    plt.plot(epochs, loss1, label="Train Loss", color="royalblue")
    plt.plot(epochs, vloss, label="Val Loss",   color="orange")
    plt.axvline(x=split, color="gray", linestyle="--", label="Fine-tune start")
    plt.title("Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.suptitle("EfficientNetB0 — Service Classifier Training (14 classes)", fontsize=13)
    plt.tight_layout()
    plt.savefig(f"{MODEL_DIR}/training_curves.png", dpi=120)
    print(f"Training curves saved to {MODEL_DIR}/training_curves.png")


if __name__ == "__main__":
    train()