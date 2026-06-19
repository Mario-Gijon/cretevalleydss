from typing import Any


VIKOR_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "VIKOR executed successfully",
            "data": {
                "rankedAlternatives": [
                    {"alternativeId": None, "name": "A2", "score": 0.8875, "rank": 1},
                    {"alternativeId": None, "name": "A3", "score": 0.7214, "rank": 2},
                    {"alternativeId": None, "name": "A1", "score": 0.4126, "rank": 3},
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
                    "collective_scores": [0.4126, 0.8875, 0.7214],
                    "flow_s": [[2.0, 0.1033], [3.0, 0.2298], [1.0, 0.4812]],
                    "flow_r": [[2.0, 0.0624], [3.0, 0.1417], [1.0, 0.2511]],
                    "flow_q": [[2.0, 0.1125], [3.0, 0.2786], [1.0, 0.5874]],
                    "solution": [[2.0, 0.1125]],
                    "v": 0.5,
                    "weights_used": [0.5, 0.5],
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing VIKOR: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

__all__ = ["VIKOR_RESPONSE_EXAMPLES"]
