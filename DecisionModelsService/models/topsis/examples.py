from typing import Any


TOPSIS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "Topsis executed successfully",
            "data": {
                "rankedAlternatives": [
                    {"alternativeId": "alt-2", "name": "A2", "score": 0.6552, "rank": 1},
                    {"alternativeId": "alt-3", "name": "A3", "score": 0.5987, "rank": 2},
                    {"alternativeId": "alt-1", "name": "A1", "score": 0.4211, "rank": 3},
                ],
                "collectiveEvaluations": {
                    "alt-1": {"crit-cost": 6.5, "crit-benefit": 5.5},
                    "alt-2": {"crit-cost": 7.5, "crit-benefit": 7.5},
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

__all__ = ["TOPSIS_RESPONSE_EXAMPLES"]
