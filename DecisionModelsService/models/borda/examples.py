from typing import Any


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

__all__ = ["BORDA_RESPONSE_EXAMPLES"]
