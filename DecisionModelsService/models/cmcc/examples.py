from typing import Any


CMCC_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "CMCC executed successfully",
            "data": {
                "success": True,
                "message": "CMCC solved optimally",
                "o_bar": [0.8, 0.8, 0.6, 0.6, 0.7],
                "g": 0.7,
                "consensus_level": 0.85,
                "objective": 0.5,
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing CMCC: <reason>",
            "data": None,
            "error": {
                "code": "MODEL_EXECUTION_ERROR",
                "field": None,
                "details": {
                    "success": False,
                    "message": "Solver ended with status " "Infeasible",
                },
            },
        },
    },
}

__all__ = ["CMCC_RESPONSE_EXAMPLES"]
