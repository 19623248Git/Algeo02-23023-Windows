import numpy as np
from scipy import linalg
from functools import partial

def standardization(X: np.ndarray): 
    '''Procedure Standarization for each column'''
    mean = np.mean(X, axis=0)
    X_centered = X - mean
    return X_centered, mean

def orthonormal_matrix(A: np.ndarray, size: int, n_iter: int, random_state) -> np.ndarray:
    '''compute orthonormal matrix Q that approximates range matrix A'''

    # Generating normal random vectors with shape: (A.shape[1], size)
    Q = np.asarray(random_state.normal(size=(A.shape[1], size)))
    if hasattr(A, "dtype") and np.issubdtype(A.dtype, np.floating):
        # Use float32 computation and components if A has a float32 dtype.
        Q = Q.astype(A.dtype, copy=False)

    
    #create a partial function for qr_normalizer
    qr_normalizer = partial(linalg.qr, mode='economic', check_finite=True)

    #create a partial function for normalizer
    normalizer = partial(linalg.lu, permute_l=True, check_finite=False)

    # Perform power iterations with Q to further 'imprint' the top
    # singular vectors of A in Q
    for _ in range(n_iter):
        Q, _ = normalizer(A @ Q)
        Q, _ = normalizer(A.T @ Q)

    # Sample the range of A using by linear projection of Q
    # Extract an orthonormal basis
    Q, _ = qr_normalizer(A @ Q)

    return Q

def svd_randomized(X: np.ndarray, n_components: int):
    '''computes randomized SVD of X_centered'''

     #get n_samples and n_features from X.shape
    n_samples, n_features = X.shape

    #create a random_state array
    random_state = np.random.mtrand._rand

    #determine the size for orthonormal matrix
    #modify the oversamples value to get better accuracy, defaults to 10
    n_oversamples = 10

    n_random = n_components + n_oversamples

    #determine the number of iterations
    n_iter = 0
    if (n_components < 0.1*min(X.shape)):
        n_iter = 7
    else:
        n_iter = 4
    
    transpose = n_samples < n_features

    if transpose:
        X = X.T

    #compute orthonormal matrix Q
    Q = orthonormal_matrix(X, n_random, n_iter, random_state)

    #compute the projection of X to the (k + p) dimensional space using Q
    B = Q.T @ X

    #perform SVD on B with divide and conquer, 'gesdd' LAPACK driver
    Uhat, s, Vt = linalg.svd(B, full_matrices=False, lapack_driver='gesdd')

    #free the memory of B
    del B
    
    U = Q @ Uhat

    #transpose back the results according to the input
    if transpose:
        return Vt[:n_components, :].T, s[:n_components], U[:, :n_components].T
    else:
        return U[:, :n_components], s[:n_components], Vt[:n_components, :]

def svd_flip(u: np.ndarray,v: np.ndarray, u_based_decision=False):
    '''Sign correction to ensure deterministic output from SVD.'''

    if u_based_decision:
        # columns of u, rows of v, or equivalently rows of u.T and v
        max_abs_u_cols = np.argmax(np.abs(u.T), axis=1)
        shift = np.arange(u.T.shape[0])
        indices = max_abs_u_cols + shift * u.T.shape[1]
        signs = np.sign(np.take(np.reshape(u.T, (-1,)), indices, axis=0))
        u *= signs[np.newaxis, :]
        if v is not None:
            v *= signs[:, np.newaxis]
    else:
        # rows of v, columns of u
        max_abs_v_rows = np.argmax(np.abs(v), axis=1)
        shift = np.arange(v.shape[0])
        indices = max_abs_v_rows + shift * v.shape[1]
        signs = np.sign(np.take(np.reshape(v, (-1,)), indices, axis=0))
        if u is not None:
            u *= signs[np.newaxis, :]
        v *= signs[:, np.newaxis]
    return u, v

def svd_truncated(X: np.ndarray, n_components: int):
    '''computes truncated SVD of X_centered'''

    #we compute the SVD with randomized SVD
    U, S, Vt = svd_randomized(X, n_components)
    
    #flip the signs of the output
    U, Vt = svd_flip(U, Vt, u_based_decision=False)

    return U, S, Vt

def fit_transform(X: np.ndarray, n_components: int):
    '''Transform the data into the reduced dimension'''

    U, S, Vt = svd_truncated(X, n_components)

    if U is not None:
        U = U[:, : n_components]

        #assume no whitten process
        U *= S[: n_components]
    
    return U, Vt

def transform(X: np.ndarray, components: np.ndarray, mean):
    '''Transform the query data into the reduced dimension'''

    X_transformed = X @ components.T
    X_transformed -= np.reshape(mean, (1, -1)) @ components.T

    return X_transformed