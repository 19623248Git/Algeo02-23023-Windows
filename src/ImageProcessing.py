from PIL import Image
import numpy as np
import os
import math

def preprocess_image_from_folder(folder_path, output_file, img_size=(120, 120)):
    '''note: img_size might subject to change to receive an integer instead of a tuple'''

    if os.path.exists(output_file):
        print(f"Preprocessed file {output_file} already exists. Skipping preprocessing.")
        return

    images = []
    image_filenames = []
    for filename in os.listdir(folder_path):
        if filename.endswith((".png", ".jpg", ".jpeg")):  # Supported image formats
            filepath = os.path.join(folder_path, filename)
            image = grayscaleConversion(Image.open(filepath))  # Convert to grayscale
            image = image.resize(img_size)  # Default resize to (120, 120)
            images.append(np.array(image).flatten())  # Flatten into 1D vector
            image_filenames.append(filename)

    np.save(output_file, {'dataset': np.array(images), 'filenames': np.array(image_filenames)})
    print(f"Preprocessed data saved to {output_file}")
    return np.array(images), image_filenames

def load_preprocessed_images(output_file: str):
    """
    Load preprocessed images from an .npy file.
    """
    data = np.load(output_file, allow_pickle=True).item()
    return data['dataset'], data['filenames']

def grayscaleConversion(image: Image.Image) -> Image:
    '''Convert an RGB or RGBA image to grayscale using the luminosity formula.'''
    
    if image.mode == "L":
        # Already grayscale
        return image
    elif image.mode == "1":
        # Black and white (1-bit)
        return image.convert("L")
    elif image.mode == "P":
        # Paletted image
        image = image.convert("RGB")
    elif image.mode in {"CMYK", "YCbCr", "LAB"}:
        # Convert to RGB first
        image = image.convert("RGB")
    elif image.mode == "I" or image.mode == "F":
        # Normalize data to 0-255 and convert
        image_array = np.asarray(image)
        normalized = ((image_array - image_array.min()) / (image_array.ptp()) * 255).astype(np.uint8)
        return Image.fromarray(normalized, mode="L")
    elif image.mode == "LA":
        # Convert to RGB, then grayscale
        image = image.convert("RGB")

    # If RGB or RGBA, proceed with standard grayscale conversion
    if image.mode in {"RGB", "RGBA"}:
        image = image.convert("RGB")
        image_array = np.asarray(image)
        grayscale_array = (
            0.299 * image_array[:, :, 0] +
            0.587 * image_array[:, :, 1] +
            0.114 * image_array[:, :, 2]
        ).astype(np.uint8)
        return Image.fromarray(grayscale_array, mode="L")
    
    raise ValueError(f"Unsupported image mode: {image.mode}")

def image_euclidean_distance(image1: np.ndarray, image2: np.ndarray):
    '''Compute the Euclidean distance between two images'''
    width = image1.shape[0]
    distance_total = 0
    for x in range(width):
        distance_of_pixel = (image1[0,x] - image2[0,x]) ** 2
        distance_total += distance_of_pixel
    distance_mean = math.sqrt(distance_total)
    return distance_mean
        
