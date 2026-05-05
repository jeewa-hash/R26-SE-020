import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras import layers, models
import os
import json

# 1. SETUP PATHS (Relative to Backend/ml_logic/)
base_dir = os.path.dirname(os.path.abspath(__file__)) + "/.."
train_dir = os.path.join(base_dir, 'dataset/train')
val_dir = os.path.join(base_dir, 'dataset/val')
model_output_dir = os.path.join(base_dir, 'models')

os.makedirs(model_output_dir, exist_ok=True)

# 2. PREPROCESSING & DATA AUGMENTATION
# This "Full Fills" your definition of pixel normalization and image resizing
train_datagen = ImageDataGenerator(
    rescale=1./255,          # Normalize pixels to [0,1]
    rotation_range=20,       # Data Augmentation for robustness
    horizontal_flip=True
)

val_datagen = ImageDataGenerator(rescale=1./255)

train_generator = train_datagen.flow_from_directory(
    train_dir,
    target_size=(224, 224),  # Correct Input Size
    batch_size=32,
    class_mode='categorical'
)

val_generator = val_datagen.flow_from_directory(
    val_dir,
    target_size=(224, 224),
    batch_size=32,
    class_mode='categorical'
)

# 3. THE "CORRECT" CNN MODEL ARCHITECTURE
# Using MobileNetV2 as a Feature Extractor (Transfer Learning)
print("Building Model using CNN Feature Extractor...")
base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
base_model.trainable = False  # Freeze the CNN features

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),  # Reduce features to a vector
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(train_generator.num_classes, activation='softmax') # Final Prediction
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# 4. TRAINING
print("--- Starting Training ---")
model.fit(train_generator, validation_data=val_generator, epochs=10)

# 5. SAVING OUTPUTS
model.save(os.path.join(model_output_dir, "service_model.h5"))

# Save class indices so the API knows which index is "Fan" or "Pipe"
with open(os.path.join(model_output_dir, "class_indices.json"), 'w') as f:
    json.dump(train_generator.class_indices, f)

print(f"✅ Model and Indices saved to: {model_output_dir}")