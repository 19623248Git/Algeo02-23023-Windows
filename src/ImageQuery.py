from PIL import Image
import numpy as np

def grayscaleConversion(image: Image.Image) -> Image:
    rgbaPixel = image.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = rgbaPixel[x, y]
            grayscaleRGB = int(0.2989 * r + 0.5870 * g + 0.1140 * b)
            aNew = 255
            if a == 0:
                rgbaPixel[x, y] = (255, 255, 255, aNew)
            else:
                # rgbaPixel[x, y] = ((int)(0.2989 * r) , (int)(0.5870 * g), (int)(0.1140 * b), aNew)
                rgbaPixel[x, y] = (grayscaleRGB, grayscaleRGB, grayscaleRGB, aNew)
    return image

def resizeImage(image: Image.Image) -> Image:
    #test numbers, subject to change
    newSize = (120, 120)
    image.resize(newSize)
    return image

def imagetoMatrix(image: Image.Image, channel: str) -> np.ndarray:
    imageMatrix = np.array(image)
    channel_index = {'r': 0, 'g': 1, 'b': 2, 'a': 3}

    if channel not in channel_index:
        raise ValueError("Channel must be one of 'r', 'g', 'b', or 'a'")
    
    return imageMatrix[:, :, channel_index[channel]]

def imageArrayFlatten(imageMatrix: np.ndarray) -> np.ndarray:
    return imageMatrix.ravel()

def flattenedImageToMatrix(imagesMatrix: np.ndarray, i: int, flattenedImage: np.ndarray):
    imagesMatrix[i] = flattenedImage

def standardization(No_Of_Column: int, Matrix_of_Image: np.ndarray): 
    '''Procedure Standarization for each column'''

    NumberOfImages = len(Matrix_of_Image)
    sum_values = 0
    for i in range(NumberOfImages):
        sum_values += Matrix_of_Image[i][No_Of_Column]
    mean = sum_values / NumberOfImages

    for i in range(NumberOfImages):
        Matrix_of_Image[i][No_Of_Column] -= mean

def full_standardization (Matrix_of_Image: np.ndarray):
    Number_of_Column= Matrix_of_Image.shape[1]
    for j in range (Number_of_Column):
        standardization(j, Matrix_of_Image)

def svd(matrix: np.ndarray):
    """
    Compute the Singular Value Decomposition (SVD) of a matrix.
    Handles rectangular matrices properly.
    """
    m, n = matrix.shape 

    ATA = matrix.T @ matrix
    eigenvalues_V, eigenvectors_V = np.linalg.eig(ATA)

    sorted_indices = np.argsort(eigenvalues_V)[::-1]  
    eigenvalues_V = eigenvalues_V[sorted_indices]
    eigenvectors_V = eigenvectors_V[:, sorted_indices]

    singular_values = np.sqrt(np.abs(eigenvalues_V))

    Sigma = np.zeros((m, n))  
    np.fill_diagonal(Sigma, singular_values)

    U = np.zeros((m, m))  
    nonzero_singular_values = singular_values[singular_values > 1e-10] 

    for i, sigma in enumerate(nonzero_singular_values):
        U[:, i] = (matrix @ eigenvectors_V[:, i]) / sigma

    return U, Sigma, eigenvectors_V.T

def covarianceMatrix(data: np.ndarray) -> np.ndarray:
    '''Function to calculate the covariance matrix of the data'''
    A = data.T
    print("A shape: ", A.shape)
    batch_size = 1000
    num_batches = A.shape[0] // batch_size
    remainder = A.shape[0] % batch_size  # Handle leftover rows

    result = np.zeros((A.shape[0], data.shape[1]))
    result = np.ascontiguousarray(result)

    # Process batches
    for i in range(num_batches):
        A_batch = A[i * batch_size:(i + 1) * batch_size, :]
        result_batch = A_batch @ data
        result[i * batch_size:(i + 1) * batch_size, :] = result_batch

    # Process the remaining data
    if remainder > 0:
        A_batch = A[num_batches * batch_size:, :]
        result_batch = A_batch @ data
        result[num_batches * batch_size:, :] = result_batch

    # Compute the final covariance matrix
    covariance_matrix = result / data.shape[0]
    return np.ascontiguousarray(covariance_matrix)


def PCA(data: np.ndarray, num_components: int) -> np.ndarray:
    '''Function to perform PCA on the data'''
    '''This function accepts a num_components parameter to specify the number of components to return'''
    data = np.ascontiguousarray(data)
    cov_matrix = covarianceMatrix(data)
    # print("covariance matrix shape: ",cov_matrix.shape)
    eig_values, eig_vectors = np.linalg.eigh(cov_matrix)
    sorted_indices = np.argsort(eig_values)[::-1]
    # eig_values = eig_values[sorted_indices]
    eig_vectors = eig_vectors[:, sorted_indices]
    return np.ascontiguousarray(eig_vectors[:, :num_components])

def projectData(data: np.ndarray, components: np.ndarray) -> np.ndarray:
    '''Function to project the data onto the principal components'''
    return np.ascontiguousarray(data @ components)

def transformQueryImage(image: Image.Image, components: np.ndarray) -> np.ndarray:
    '''Function to query an image using the principal components'''
    image = grayscaleConversion(image)
    image = resizeImage(image)
    imageMatrix = imagetoMatrix(image)
    flattenedImage = imageArrayFlatten(imageMatrix)
    mean = np.mean(flattenedImage)
    standardizedImage = flattenedImage - mean
    return projectData(standardizedImage, components)

def shortestDistance(queryImage: np.ndarray, projectMatrix: np.ndarray) -> int:
    '''Function to find the shortest distance between the query image and the images in the matrix'''
    distances = np.linalg.norm(projectMatrix - queryImage, axis=1) #subject to change
    return np.argmin(distances)

def findImage(queryImage: Image.Image, components: np.ndarray, imagesMatrix: np.ndarray):
    '''Function to find the image in the matrix that is closest to the query image'''
    queryImage = transformQueryImage(queryImage, components)
    index = shortestDistance(queryImage, imagesMatrix)
    print(index)
    # return imagesMatrix[index]