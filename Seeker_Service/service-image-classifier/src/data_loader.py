import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

def get_data_generators(data_dir, target_size=(224, 224), batch_size=32):
    # 1. Augmentation for Training (to prevent overfitting)
    # We use augmentation only on training data to help the model generalize
    train_datagen = ImageDataGenerator(
        rescale=1./255,             # Normalize pixels to [0, 1]
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
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