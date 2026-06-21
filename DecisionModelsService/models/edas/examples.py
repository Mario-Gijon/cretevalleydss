from typing import Any


EDAS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "EDAS executed successfully",
            "data": {
                "rankedAlternatives": [
                    {"alternativeId": "alt-2", "name": "A2", "score": 0.8812, "rank": 1},
                    {"alternativeId": "alt-3", "name": "A3", "score": 0.7465, "rank": 2},
                    {"alternativeId": "alt-1", "name": "A1", "score": 0.5381, "rank": 3},
                ],
                "collectiveEvaluations": {
                    "alt-1": {"crit-cost": 0.45, "crit-benefit": 0.62},
                    "alt-2": {"crit-cost": 0.31, "crit-benefit": 0.84},
                    "alt-3": {"crit-cost": 0.38, "crit-benefit": 0.78},
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
