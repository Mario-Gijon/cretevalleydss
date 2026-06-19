from typing import Any


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

__all__ = ["MARCOS_RESPONSE_EXAMPLES"]
