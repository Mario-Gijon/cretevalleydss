from typing import Any


EDAS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "EDAS executed successfully",
            "data": {
                "rankedAlternatives": [
                    {"alternativeId": None, "name": "A2", "score": 0.8812, "rank": 1},
                    {"alternativeId": None, "name": "A3", "score": 0.7465, "rank": 2},
                    {"alternativeId": None, "name": "A1", "score": 0.5381, "rank": 3},
                ],
                "collectiveEvaluations": {
                    "A1": {"Cost": 0.45, "Benefit": 0.62},
                    "A2": {"Cost": 0.31, "Benefit": 0.84},
                    "A3": {"Cost": 0.38, "Benefit": 0.78},
                },
                "plotsGraphic": {
                    "expert_points": [[-0.1187, 0.0492], [0.1187, -0.0492]],
                    "collective_point": [0.0074, -0.0031],
                },
                "consensusMeasure": None,
                "rawOutput": {
                    "collective_ranking": [1, 2, 0],
                    "collective_scores": [0.5381, 0.8812, 0.7465],
                    "a_s": [0.5381, 0.8812, 0.7465],
                    "weights_used": [0.5, 0.5],
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing EDAS: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

__all__ = ["EDAS_RESPONSE_EXAMPLES"]
