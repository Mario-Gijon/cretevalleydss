from typing import Any


BWM_REQUEST_EXAMPLES: dict[str, dict[str, Any]] = {
    "basic_criteria_weighting": {
        "summary": "Basic criteria weighting request",
        "description": (
            "Executes BWM for three criteria using two expert evaluations. Each expert "
            "provides Best-to-Others and Others-to-Worst comparison vectors using the "
            "1-9 BWM scale."
        ),
        "value": {
            "context": {
                "issue": {
                    "id": "issue-bwm-001",
                    "name": "Supplier selection criteria weighting",
                    "consensusThreshold": None,
                    "consensusMaxPhases": None,
                },
                "criteria": [
                    {
                        "id": "crit-quality",
                        "name": "Quality",
                    },
                    {
                        "id": "crit-cost",
                        "name": "Cost",
                    },
                    {
                        "id": "crit-delivery",
                        "name": "Delivery reliability",
                    },
                ],
                "consensusPhase": 0,
                "previousStageResult": None,
                "structure": {
                    "key": "bestWorstCriteria",
                    "stage": "criteriaWeighting",
                },
            },
            "modelParameters": {
                "eps_penalty": 1,
            },
            "evaluations": [
                {
                    "expert": {
                        "id": "expert-ana",
                        "name": "Ana Torres",
                        "email": "ana.torres@example.com",
                    },
                    "payload": {
                        "bestCriterionId": "crit-quality",
                        "worstCriterionId": "crit-cost",
                        "bestToOthers": {
                            "crit-quality": 1,
                            "crit-cost": 5,
                            "crit-delivery": 3,
                        },
                        "othersToWorst": {
                            "crit-quality": 5,
                            "crit-cost": 1,
                            "crit-delivery": 3,
                        },
                    },
                },
                {
                    "expert": {
                        "id": "expert-luis",
                        "name": "Luis Romero",
                        "email": "luis.romero@example.com",
                    },
                    "payload": {
                        "bestCriterionId": "crit-quality",
                        "worstCriterionId": "crit-cost",
                        "bestToOthers": {
                            "crit-quality": 1,
                            "crit-cost": 6,
                            "crit-delivery": 4,
                        },
                        "othersToWorst": {
                            "crit-quality": 6,
                            "crit-cost": 1,
                            "crit-delivery": 2,
                        },
                    },
                },
            ],
        },
    }
}


BWM_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "description": (
            "Example success response shape. The exact weights should be regenerated "
            "from BWM_REQUEST_EXAMPLES['basic_criteria_weighting'] when strict "
            "response-example comparisons are enabled."
        ),
        "value": {
            "success": True,
            "message": "BWM executed successfully",
            "data": {
                "message": "Criteria weights for 'Supplier selection criteria weighting' successfully computed.",
                "weightsByCriterion": {
                    "crit-quality": 0.0,
                    "crit-cost": 0.0,
                    "crit-delivery": 0.0,
                },
                "collectiveEvaluations": {
                    "weightsByCriterion": {
                        "crit-quality": 0.0,
                        "crit-cost": 0.0,
                        "crit-delivery": 0.0,
                    },
                },
                "consensusMeasure": None,
                "rawOutput": {
                    "success": True,
                    "expertWeights": {},
                    "expertInputs": {},
                    "n_experts": 2,
                    "eps_penalty": 1.0,
                    "useMcc": True,
                    "expertWeightsByExpert": {},
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


__all__ = ["BWM_REQUEST_EXAMPLES", "BWM_RESPONSE_EXAMPLES"]