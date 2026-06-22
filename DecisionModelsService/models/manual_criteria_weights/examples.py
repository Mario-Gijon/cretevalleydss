from typing import Any


MANUAL_CRITERIA_WEIGHTS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "Manual criteria weights executed successfully",
            "data": {
                "message": "Criteria weights computed successfully",
                "consensusMeasure": None,
                "weightsByCriterion": {
                    "criterion-1": 0.4,
                    "criterion-2": 0.6,
                },
                "collectiveEvaluations": {
                    "weightsByCriterion": {
                        "criterion-1": 0.4,
                        "criterion-2": 0.6,
                    }
                },
                "rawOutput": {
                    "averagedWeightsByCriterion": {
                        "criterion-1": 0.4,
                        "criterion-2": 0.6,
                    }
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing manual criteria weights: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

__all__ = ["MANUAL_CRITERIA_WEIGHTS_RESPONSE_EXAMPLES"]
