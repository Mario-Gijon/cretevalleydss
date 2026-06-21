from typing import Any


FUZZY_TOPSIS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "Fuzzy TOPSIS executed successfully",
            "data": {
                "rankedAlternatives": [
                    {"alternativeId": "alt-2", "name": "A2", "score": 0.7124, "rank": 1},
                    {"alternativeId": "alt-1", "name": "A1", "score": 0.4871, "rank": 2},
                ],
                "collectiveEvaluations": {
                    "alt-1": {"crit-cost": [1.0, 2.0, 3.0]},
                    "alt-2": {"crit-cost": [2.5, 3.5, 4.5]},
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

__all__ = ["FUZZY_TOPSIS_RESPONSE_EXAMPLES"]
