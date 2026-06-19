from typing import Any


BWM_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "BWM executed successfully",
            "data": {
                "message": "Criteria weights for 'Example issue' successfully computed.",
                "weightsByCriterion": {"Cost": 0.53, "Quality": 0.29, "Risk": 0.18},
                "collectiveEvaluations": {
                    "weightsByCriterion": {"Cost": 0.53, "Quality": 0.29, "Risk": 0.18},
                },
                "consensusMeasure": None,
                "modelExecution": {
                    "kind": "apiModels",
                    "apiModelKey": "bwm",
                    "apiEndpointPath": "/bwm",
                },
                "rawOutput": {
                    "success": True,
                    "weights": [0.53, 0.29, 0.18],
                    "n_experts": 2,
                    "mic_avg": [1.0, 3.5, 6.0],
                    "lic_avg": [6.0, 3.5, 1.0],
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing BWM",
            "data": None,
            "error": {"code": "MODEL_EXECUTION_ERROR", "field": None, "details": None},
        },
    },
}

__all__ = ["BWM_RESPONSE_EXAMPLES"]
