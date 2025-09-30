#Required Libraries
import numpy as np

# Fuzzy TOPSIS
from pyDecision.algorithm import fuzzy_topsis_method

# Fuzzy TOPSIS

# Weigths
weights = list([
          [ (  0.1,   0.2,   0.3), (  0.7,   0.8,   0.9), (  0.3,   0.5,   0.8) ]
    ])

# Load Criterion Type: 'max' or 'min'
criterion_type = ['max', 'max', 'min']

# Dataset
dataset = list([
    [ (  3,   6,   9), (  5,   8,   9), (  5,   7,   9) ],   #a1
    [ (  5,   7,   9), (  3,   7,   9), (  3,   5,   7) ],   #a2
    [ (  5,   8,   9), (  3,   5,   7), (  1,   2,   3) ],   #a3
    [ (  1,   2,   4), (  1,   4,   7), (  1,   2,   5) ]    #a4
    ])

# Call Fuzzy TOPSIS
relative_closeness = fuzzy_topsis_method(dataset, weights, criterion_type, graph = True, verbose = True)