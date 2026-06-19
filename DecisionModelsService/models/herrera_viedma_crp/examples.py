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

__all__ = ["HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES"]
