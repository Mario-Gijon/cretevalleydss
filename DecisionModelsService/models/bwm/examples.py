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
        "description": "Successful BWM execution for the basic criteria weighting request.",
        "value": {
            "success": True,
            "message": "BWM executed successfully",
            "data": {
                "message": "Criteria weights for 'Supplier selection criteria weighting' successfully computed.",
                "weightsByCriterion": {
                    "crit-quality": 0.67407408,
                    "crit-cost": 0.11111111,
                    "crit-delivery": 0.21481481,
                },
                "collectiveEvaluations": {
                    "weightsByCriterion": {
                        "crit-quality": 0.67407408,
                        "crit-cost": 0.11111111,
                        "crit-delivery": 0.21481481,
                    },
                },
                "consensusMeasure": None,
                "rawOutput": {
                    "success": True,
                    "expertWeights": {
                        "ana.torres@example.com": [
                            0.6444444465366373,
                            0.1111111114807921,
                            0.2444444419825706,
                        ],
                        "luis.romero@example.com": [
                            0.7037037051688773,
                            0.11111111224437394,
                            0.18518518258674882,
                        ],
                    },
                    "expertInputs": {
                        "ana.torres@example.com": {
                            "mic": [1.0, 5.0, 3.0],
                            "lic": [5.0, 1.0, 3.0],
                        },
                        "luis.romero@example.com": {
                            "mic": [1.0, 6.0, 4.0],
                            "lic": [6.0, 1.0, 2.0],
                        },
                    },
                    "n_experts": 2,
                    "eps_penalty": 1.0,
                    "useMcc": True,
                    "expertWeightsByExpert": {
                        "ana.torres@example.com": {
                            "crit-quality": 0.6444444465366373,
                            "crit-cost": 0.1111111114807921,
                            "crit-delivery": 0.2444444419825706,
                        },
                        "luis.romero@example.com": {
                            "crit-quality": 0.7037037051688773,
                            "crit-cost": 0.11111111224437394,
                            "crit-delivery": 0.18518518258674882,
                        },
                    },
                    "mcc": {
                        "useMcc": True,
                        "eps": 0.05,
                        "status": "Optimal",
                        "objective": 0.0,
                        "weightsByCriterion": {
                            "crit-quality": 0.67407408,
                            "crit-cost": 0.11111111,
                            "crit-delivery": 0.21481481,
                        },
                        "adjustedWeightsByExpert": {
                            "ana.torres@example.com": {
                                "crit-quality": 0.64444445,
                                "crit-cost": 0.11111111,
                                "crit-delivery": 0.24444444,
                            },
                            "luis.romero@example.com": {
                                "crit-quality": 0.70370371,
                                "crit-cost": 0.11111111,
                                "crit-delivery": 0.18518518,
                            },
                        },
                        "originalWeightsByExpert": {
                            "ana.torres@example.com": {
                                "crit-quality": 0.6444444465366373,
                                "crit-cost": 0.1111111114807921,
                                "crit-delivery": 0.2444444419825706,
                            },
                            "luis.romero@example.com": {
                                "crit-quality": 0.7037037051688773,
                                "crit-cost": 0.11111111224437394,
                                "crit-delivery": 0.18518518258674882,
                            },
                        },
                    },
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
