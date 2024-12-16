import numpy as np
import ImageProcessing as ip
from PIL import Image
import pca as pcakw
# import matplotlib.pyplot as plt
import time

def CBIR(image_features_path: str, query_image_path: str, img_size: tuple): 

    #set the timer at start of the program
    start_time = time.time()

    #Perform preprocessing methods for the dataset

    #process the images into a matrix dataset
    image_dataset, image_filenames = ip.load_preprocessed_images(image_features_path)

    #show the dataset shape
    print(f"Loaded {len(image_dataset)} images with shape {image_dataset.shape}")

    #standardize the dataset
    #from now on, the dataset for PCA is X
    X = image_dataset.copy()
    X_centered, mean = pcakw.standardization(X)

    #determine n components for PCA
    num_components = 100

    #perform PCA
    pca_features, components = pcakw.fit_transform(X_centered, num_components)
    print(f"PCA features shape: {pca_features.shape}")
    # print(pca_features)

    query_image = ip.grayscaleConversion(Image.open(query_image_path))
    query_image = query_image.resize(img_size)
    query_image = np.array(query_image).flatten().reshape(1, -1)  # Flatten and reshape
    query_features = pcakw.transform(query_image, components, mean)

    distance_between_query = np.zeros(len(pca_features))
    for i in range(len(pca_features)):
        image_data = pca_features[i].flatten().reshape(1, -1)
        distance = ip.image_euclidean_distance(query_features, image_data)
        distance_between_query[i] = distance

    #stop the timer
    end_time = time.time()

    print("Total estimated time: ", end_time - start_time)

    # for calling APIs this is not used
    # #sort the distances
    top_k = 10
    top_indices = np.argsort(distance_between_query)[:top_k]

    # Sort image_filenames based on top_indices
    sorted_filenames = [image_filenames[i] for i in top_indices]
    distance_between_query = [distance_between_query[i] for i in top_indices]

    return sorted_filenames, distance_between_query
    # Display results
    # print("Top matches:")
    # for idx in top_indices:
    #     print(f"{image_filenames[idx]} (Distance: {distance_between_query[idx]:.4f})")
    #     plt.imshow(image_dataset[idx].reshape(img_size), cmap='gray')
    #     plt.title(f"Match: {image_filenames[idx]} (Distance: {distance_between_query[idx]:.4f})")
    #     plt.axis('off')
    #     plt.show()


# #define the path to the dataset
# folder_path = "images"
# img_size = (100, 100)
# #transform the query image
# query_image_path = "input.png"
# image_dataset, image_filenames = ip.load_preprocessed_images("features.npy")
# CBIF(folder_path, query_image_path, img_size)