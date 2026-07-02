from typing import Any

BORDA_REQUEST_EXAMPLES: dict[str, dict[str, Any]] = {
    "basic_numeric_matrix": {
        "summary": "Basic numeric matrix request",
        "description": (
            "Executes Borda with three alternatives, three criteria, two experts, "
            "numeric ratings, and benefit/cost criterion types. Borda does not use "
            "criterion weights in this implementation."
        ),
        "value": {
            "context": {
                "issue": {
                    "id": "issue-borda-001",
                    "name": "Supplier selection with Borda",
                    "consensusThreshold": None,
                    "consensusMaxPhases": None,
                },
                "alternatives": [
                    {"id": "alt-supplier-a", "name": "Supplier A"},
                    {"id": "alt-supplier-b", "name": "Supplier B"},
                    {"id": "alt-supplier-c", "name": "Supplier C"},
                ],
                "criteria": [
                    {
                        "id": "crit-quality",
                        "name": "Quality",
                        "type": "benefit",
                    },
                    {
                        "id": "crit-cost",
                        "name": "Cost",
                        "type": "cost",
                    },
                    {
                        "id": "crit-delivery",
                        "name": "Delivery reliability",
                        "type": "benefit",
                    },
                ],
                "consensusPhase": 0,
                "previousStageResult": None,
                "structure": {
                    "key": "alternativeCriteriaMatrix",
                    "stage": "alternativeEvaluation",
                },
            },
            "modelParameters": {},
            "evaluations": [
                {
                    "expert": {
                        "id": "expert-ana",
                        "name": "Ana Torres",
                        "email": "ana.torres@example.com",
                    },
                    "payload": {
                        "alt-supplier-a": {
                            "crit-quality": {"value": 8.0},
                            "crit-cost": {"value": 6.0},
                            "crit-delivery": {"value": 7.0},
                        },
                        "alt-supplier-b": {
                            "crit-quality": {"value": 7.0},
                            "crit-cost": {"value": 5.0},
                            "crit-delivery": {"value": 8.0},
                        },
                        "alt-supplier-c": {
                            "crit-quality": {"value": 9.0},
                            "crit-cost": {"value": 8.0},
                            "crit-delivery": {"value": 6.0},
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
                        "alt-supplier-a": {
                            "crit-quality": {"value": 7.0},
                            "crit-cost": {"value": 6.0},
                            "crit-delivery": {"value": 8.0},
                        },
                        "alt-supplier-b": {
                            "crit-quality": {"value": 8.0},
                            "crit-cost": {"value": 4.0},
                            "crit-delivery": {"value": 9.0},
                        },
                        "alt-supplier-c": {
                            "crit-quality": {"value": 9.0},
                            "crit-cost": {"value": 7.0},
                            "crit-delivery": {"value": 7.0},
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


__all__ = ["BORDA_REQUEST_EXAMPLES", "BORDA_RESPONSE_EXAMPLES"]
