"""Ejemplos OpenAPI de respuesta para los endpoints de modelos."""

from typing import Any

HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "Herrera Viedma CRP executed successfully",
            "data": {
                "rankedAlternatives": [
                    {"alternativeId": None, "name": "A2", "score": 0.701234, "rank": 1},
                    {"alternativeId": None, "name": "A1", "score": 0.612345, "rank": 2},
                    {"alternativeId": None, "name": "A3", "score": 0.533211, "rank": 3},
                ],
                "collectiveEvaluations": {
                    "Cost": {
                        "A1::A2": 0.68,
                        "A1::A3": 0.43,
                    }
                },
                "plotsGraphic": {
                    "expert_points": [[-0.1213, 0.0842], [0.1213, -0.0842]],
                    "collective_point": [0.0194, -0.0312],
                },
                "consensusMeasure": 0.88,
                "rawOutput": {"alternatives_rankings": [1, 0, 2]},
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
                "rankedAlternatives": [
                    {"alternativeId": None, "name": "A2", "score": 0.6552, "rank": 1},
                    {"alternativeId": None, "name": "A3", "score": 0.5987, "rank": 2},
                    {"alternativeId": None, "name": "A1", "score": 0.4211, "rank": 3},
                ],
                "collectiveEvaluations": {
                    "A1": {"Cost": 6.5, "Benefit": 5.5},
                    "A2": {"Cost": 7.5, "Benefit": 7.5},
                },
                "plotsGraphic": {
                    "expert_points": [[-0.1187, 0.0492], [0.1187, -0.0492]],
                    "collective_point": [0.0074, -0.0031],
                },
                "consensusMeasure": None,
                "rawOutput": {"collective_ranking": [1, 2, 0]},
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
                "rankedAlternatives": [
                    {"alternativeId": None, "name": "A2", "score": 5.0, "rank": 1},
                    {"alternativeId": None, "name": "A3", "score": 4.0, "rank": 2},
                    {"alternativeId": None, "name": "A1", "score": 3.0, "rank": 3},
                ],
                "collectiveEvaluations": {
                    "A1": {"Cost": 6.5, "Benefit": 5.5},
                    "A2": {"Cost": 7.5, "Benefit": 7.5},
                },
                "plotsGraphic": {
                    "expert_points": [[-0.0932, 0.0721], [0.0932, -0.0721]],
                    "collective_point": [0.0017, -0.0149],
                },
                "consensusMeasure": None,
                "rawOutput": {"collective_ranking": [1, 2, 0]},
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
                "rankedAlternatives": [
                    {"alternativeId": None, "name": "A2", "score": 1.0, "rank": 1},
                    {"alternativeId": None, "name": "A3", "score": 0.934, "rank": 2},
                    {"alternativeId": None, "name": "A1", "score": 0.812, "rank": 3},
                ],
                "collectiveEvaluations": {
                    "A1": {"Cost": 6.5, "Benefit": 5.5},
                    "A2": {"Cost": 7.5, "Benefit": 7.5},
                },
                "plotsGraphic": {
                    "expert_points": [[-0.1187, 0.0492], [0.1187, -0.0492]],
                    "collective_point": [0.0074, -0.0031],
                },
                "consensusMeasure": None,
                "rawOutput": {"collective_ranking": [1, 2, 0]},
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
                "rankedAlternatives": [
                    {"alternativeId": None, "name": "A2", "score": 0.7124, "rank": 1},
                    {"alternativeId": None, "name": "A1", "score": 0.4871, "rank": 2},
                ],
                "collectiveEvaluations": {
                    "A1": {"Cost": [1.0, 2.0, 3.0]},
                    "A2": {"Cost": [2.5, 3.5, 4.5]},
                },
                "plotsGraphic": {
                    "expert_points": [[-0.0711, 0.0579], [0.0711, -0.0579]],
                    "collective_point": [0.0142, 0.0033],
                },
                "consensusMeasure": None,
                "rawOutput": {"collective_ranking": [1, 0]},
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
                "rankedAlternatives": [
                    {"alternativeId": None, "name": "A3", "score": 0.7814, "rank": 1},
                    {"alternativeId": None, "name": "A4", "score": 0.6942, "rank": 2},
                    {"alternativeId": None, "name": "A1", "score": 0.6421, "rank": 3},
                    {"alternativeId": None, "name": "A5", "score": 0.5875, "rank": 4},
                    {"alternativeId": None, "name": "A2", "score": 0.5317, "rank": 5},
                ],
                "collectiveEvaluations": {
                    "A1": {"Cost": 255.0, "Benefit": 16.0},
                    "A2": {"Cost": 205.0, "Benefit": 16.0},
                },
                "plotsGraphic": {
                    "expert_points": [[-0.1187, 0.0492], [0.1187, -0.0492]],
                    "collective_point": [0.0074, -0.0031],
                },
                "consensusMeasure": None,
                "rawOutput": {"collective_ranking": [2, 3, 0, 4, 1]},
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
