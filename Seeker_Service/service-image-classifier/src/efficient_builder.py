import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, Input, BatchNormalization
from tensorflow.keras.models import Model

def build_repair_model(num_classes=4):
    # 1. Define input (RGB - 3 channels)
    img_input = Input(shape=(224, 224, 3))

    # 2. Load architecture without weights to avoid the Stem Conv crash
    base_model = EfficientNetB0(
        include_top=False,
        weights=None, 
        input_tensor=img_input
    )

    # 3. Download and Inject weights manually
    weights_path = tf.keras.utils.get_file(
        'efficientnetb0_notop.h5',
        'https://storage.googleapis.com/keras-applications/efficientnetb0_notop.h5',
        cache_subdir='models'
    )
    # Load weights by name skips the mismatched input layer but keeps the deep features
    base_model.load_weights(weights_path, by_name=True, skip_mismatch=True)
    
    # 4. UNFREEZE for Fine-Tuning (Crucial for EfficientNet to pass 33% accuracy)
    base_model.trainable = True

    # 5. Build the Classification Head
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x) # Improves stability during training
    x = Dropout(0.4)(x) 
    predictions = Dense(num_classes, activation='softmax')(x)

    model = Model(inputs=img_input, outputs=predictions)
    
    # 6. Use a VERY LOW learning rate (1e-5)
    # Higher rates will destroy the pre-trained knowledge
    optimizer = tf.keras.optimizers.Adam(learning_rate=0.00001)

    model.compile(
        optimizer=optimizer,
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model