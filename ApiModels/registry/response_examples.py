"""Ejemplos OpenAPI de respuesta para los endpoints de modelos."""

from typing import Any

HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "Herrera Viedma CRP executed successfully",
            "data": {
                "alternatives_rankings": [1, 0, 2],
                "cm": 0.88,
                "collective_scores": [0.612345, 0.701234, 0.533211],
                "collective_evaluations": {
                    "preference": [
                        [0.0, 0.68, 0.43],
                        [0.32, 0.0, 0.58],
                        [0.57, 0.42, 0.0],
                    ]
                },
                "plots_graphic": {
                    "expert_points": [[-0.1213, 0.0842], [0.1213, -0.0842]],
                    "collective_point": [0.0194, -0.0312],
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing Herrera Viedma CRP: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

TOPSIS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "Topsis executed successfully",
            "data": {
                "collective_matrix": [
                    [6.5, 5.5, 6.5],
                    [7.5, 7.5, 5.5],
                    [7.0, 7.5, 6.0],
                ],
                "matrix_used": [[6.5, 5.5, 6.5], [7.5, 7.5, 5.5], [7.0, 7.5, 6.0]],
                "collective_scores": [0.4211, 0.6552, 0.5987],
                "collective_ranking": [1, 2, 0],
                "plots_graphic": {
                    "expert_points": [[-0.1187, 0.0492], [0.1187, -0.0492]],
                    "collective_point": [0.0074, -0.0031],
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing Topsis: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

BORDA_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "Borda executed successfully",
            "data": {
                "collective_matrix": [[6.5, 5.5], [7.5, 7.5], [7.0, 7.5]],
                "matrix_used": [[6.5, 5.5], [7.5, 7.5], [7.0, 7.5]],
                "collective_scores": [3.0, 5.0, 4.0],
                "collective_ranking": [1, 2, 0],
                "plots_graphic": {
                    "expert_points": [[-0.0932, 0.0721], [0.0932, -0.0721]],
                    "collective_point": [0.0017, -0.0149],
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing Borda: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

ARAS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "Aras executed successfully",
            "data": {
                "collective_matrix": [
                    [6.5, 5.5, 6.5],
                    [7.5, 7.5, 5.5],
                    [7.0, 7.5, 6.0],
                ],
                "matrix_used": [[6.5, 5.5, 6.5], [7.5, 7.5, 5.5], [7.0, 7.5, 6.0]],
                "collective_scores": [0.812, 1.0, 0.934],
                "collective_ranking": [1, 2, 0],
                "plots_graphic": {
                    "expert_points": [[-0.1187, 0.0492], [0.1187, -0.0492]],
                    "collective_point": [0.0074, -0.0031],
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing Aras: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

FUZZY_TOPSIS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "Fuzzy TOPSIS executed successfully",
            "data": {
                "collective_matrix": [
                    [[1.0, 2.0, 3.0], [2.5, 3.5, 4.5]],
                    [[2.5, 3.5, 4.5], [4.0, 5.0, 6.0]],
                ],
                "collective_scores": [0.4871, 0.7124],
                "collective_ranking": [1, 0],
                "plots_graphic": {
                    "expert_points": [[-0.0711, 0.0579], [0.0711, -0.0579]],
                    "collective_point": [0.0142, 0.0033],
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing Fuzzy TOPSIS: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

MARCOS_RESPONSE_EXAMPLES = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "MARCOS executed successfully",
            "data": {
                "collective_matrix": [
                    [255.0, 16.0, 12.0, 5.0],
                    [205.0, 16.0, 8.0, 3.0],
                    [295.0, 32.0, 16.0, 4.0],
                    [272.5, 32.0, 8.0, 4.0],
                    [227.5, 16.0, 16.0, 2.0],
                ],
                "matrix_used": [
                    [255.0, 16.0, 12.0, 5.0],
                    [205.0, 16.0, 8.0, 3.0],
                    [295.0, 32.0, 16.0, 4.0],
                    [272.5, 32.0, 8.0, 4.0],
                    [227.5, 16.0, 16.0, 2.0],
                ],
                "collective_scores": [0.6421, 0.5317, 0.7814, 0.6942, 0.5875],
                "collective_ranking": [2, 3, 0, 4, 1],
                "plots_graphic": {
                    "expert_points": [[-0.1187, 0.0492], [0.1187, -0.0492]],
                    "collective_point": [0.0074, -0.0031],
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing MARCOS: <reason>",
            "data": None,
            "error": {
                "code": "INTERNAL_ERROR",
                "field": None,
                "details": None,
            },
        },
    },
}

BWM_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "BWM executed successfully",
            "data": {
                "success": True,
                "weights": [0.53, 0.29, 0.18],
                "n_experts": 2,
                "mic_avg": [1.0, 3.5, 6.0],
                "lic_avg": [6.0, 3.5, 1.0],
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing BWM",
            "data": None,
            "error": {"code": "MODEL_EXECUTION_ERROR", "field": None, "details": None},
        },
    },
}

CMCC_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "CMCC executed successfully",
            "data": {
                "success": True,
                "message": "CMCC solved optimally",
                "o_bar": [0.8, 0.8, 0.6, 0.6, 0.7],
                "g": 0.7,
                "consensus_level": 0.85,
                "objective": 0.5,
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing CMCC: <reason>",
            "data": None,
            "error": {
                "code": "MODEL_EXECUTION_ERROR",
                "field": None,
                "details": {
                    "success": False,
                    "message": "Solver ended with status " "Infeasible",
                },
            },
        },
    },
}

__all__ = [
    "HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES",
    "TOPSIS_RESPONSE_EXAMPLES",
    "BORDA_RESPONSE_EXAMPLES",
    "ARAS_RESPONSE_EXAMPLES",
    "FUZZY_TOPSIS_RESPONSE_EXAMPLES",
    "BWM_RESPONSE_EXAMPLES",
    "CMCC_RESPONSE_EXAMPLES",
]
