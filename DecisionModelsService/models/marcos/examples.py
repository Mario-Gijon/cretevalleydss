from typing import Any


MARCOS_RESPONSE_EXAMPLES = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "MARCOS executed successfully",
            "data": {
                "rankedAlternatives": [
                    {"alternativeId": "alt-3", "name": "A3", "score": 0.7814, "rank": 1},
                    {"alternativeId": "alt-4", "name": "A4", "score": 0.6942, "rank": 2},
                    {"alternativeId": "alt-1", "name": "A1", "score": 0.6421, "rank": 3},
                    {"alternativeId": "alt-5", "name": "A5", "score": 0.5875, "rank": 4},
                    {"alternativeId": "alt-2", "name": "A2", "score": 0.5317, "rank": 5},
                ],
                "collectiveEvaluations": {
                    "alt-1": {"crit-cost": 255.0, "crit-benefit": 16.0},
                    "alt-2": {"crit-cost": 205.0, "crit-benefit": 16.0},
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
