from typing import Any


PROMETHEE_VI_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "PROMETHEE VI executed successfully",
            "data": {
                "rankedAlternatives": [
                    {"alternativeId": None, "name": "A5", "score": 0.412, "rank": 1},
                    {"alternativeId": None, "name": "A1", "score": 0.331, "rank": 2},
                    {"alternativeId": None, "name": "A4", "score": 0.287, "rank": 3},
                ],
                "collectiveEvaluations": {
                    "A1": {"C1": 8.84, "C2": 8.79},
                    "A2": {"C1": 8.57, "C2": 8.51},
                },
                "plotsGraphic": {
                    "expert_points": [[-0.1187, 0.0492], [0.1187, -0.0492]],
                    "collective_point": [0.0074, -0.0031],
                },
                "consensusMeasure": None,
                "rawOutput": {
                    "favorable_ranking": [[5.0, 0.412], [1.0, 0.331]],
                    "minus_ranking": [[5.0, 0.398], [1.0, 0.320]],
                    "plus_ranking": [[5.0, 0.427], [1.0, 0.344]],
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing PROMETHEE VI: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

__all__ = ["PROMETHEE_VI_RESPONSE_EXAMPLES"]
