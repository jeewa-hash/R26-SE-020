import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

def get_data_generators(data_dir, target_size=(224, 224), batch_size=32):
    # 1. Augmentation for Training (to prevent overfitting)
    # We use augmentation only on training data to help the model generalize
    train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=30,      # Randomly rotate images
    width_shift_range=0.2,  # Randomly shift horizontally
    height_shift_range=0.2, # Randomly shift vertically
    shear_range=0.2,        # Distort the image slightly
    zoom_range=0.2,         # Randomly zoom in
    horizontal_flip=True,   # Flip images
    fill_mode='nearest'
)

    # 2. Only Rescaling for Validation and Test (keep them pure)
    # We do NOT augment validation data because we want to test on real-world images
    test_datagen = ImageDataGenerator(rescale=1./255)

    # 3. Training Generator
    train_generator = train_datagen.flow_from_directory(
        f"{data_dir}/train",
        target_size=target_size,
        batch_size=batch_size,
        class_mode='categorical',
        color_mode='rgb',
        shuffle=True  # Shuffling during training is good for learning
    )

    # 4. Validation Generator
    # FIXED: shuffle=False is critical for correct Confusion Matrix/Classification Reports
    val_generator = test_datagen.flow_from_directory(
        f"{data_dir}/val",
        target_size=target_size,
        batch_size=batch_size,
        class_mode='categorical',
        color_mode='rgb',
        shuffle=False  # Do not shuffle so predictions match the labels
    )

    return train_generator, val_generator