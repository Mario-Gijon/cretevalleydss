from typing import Any


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

__all__ = ["ARAS_RESPONSE_EXAMPLES"]
