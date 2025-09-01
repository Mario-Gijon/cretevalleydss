import numpy as np

from pyDecision.algorithm import topsis_method

# TOPSIS

# Weights
weights =  [0.25, 0.25, 0.25, 0.25]

# Load Criterion Type: 'max' or 'min'
criterion_type = ['max', 'max', 'max', 'max']

# Dataset
dataset = np.array([
                [6, 8, 4, 7],   #a1
                [9, 3, 4, 6],   #a2
                [4, 9, 7, 3],   #a3
                [8, 2, 5, 8],   #a4
                [4, 9, 2, 3],   #a5
                [7, 5, 9, 9],   #a6
                [9, 6, 3, 1],   #a7
                [3, 5, 7, 6],   #a8
                [5, 3, 8, 5],   #a9
                [4, 6, 3, 8],   #a10
                ])

# Call TOPSIS
relative_closeness = topsis_method(dataset, weights, criterion_type)

print(relative_closeness)