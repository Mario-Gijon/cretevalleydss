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
                    "Cost": 0.4,
                    "Benefit": 0.6,
                },
                "collectiveEvaluations": {
                    "weightsByCriterion": {
                        "Cost": 0.4,
                        "Benefit": 0.6,
                    }
                },
                "modelExecution": {
                    "kind": "apiModels",
                    "apiModelKey": "manual_criteria_weights",
                    "apiEndpointPath": "/manual_criteria_weights",
                },
                "rawOutput": {
                    "averagedWeightsByCriterion": {
                        "Cost": 0.4,
                        "Benefit": 0.6,
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
