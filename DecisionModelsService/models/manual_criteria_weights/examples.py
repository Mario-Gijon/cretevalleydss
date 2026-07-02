from typing import Any

MANUAL_CRITERIA_WEIGHTS_REQUEST_EXAMPLES: dict[str, dict[str, Any]] = {
    "basic_manual_weights": {
        "summary": "Basic manual criteria weights request",
        "description": (
            "Executes manual criteria weighting with three criteria and two expert "
            "weight vectors. Each expert payload sums to one."
        ),
        "value": {
            "context": {
                "issue": {
                    "id": "issue-manual-weights-001",
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
                    "key": "manualCriteriaWeights",
                    "stage": "criteriaWeighting",
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
                        "weightsByCriterion": {
                            "crit-quality": 0.50,
                            "crit-cost": 0.30,
                            "crit-delivery": 0.20,
                        }
                    },
                },
                {
                    "expert": {
                        "id": "expert-luis",
                        "name": "Luis Romero",
                        "email": "luis.romero@example.com",
                    },
                    "payload": {
                        "weightsByCriterion": {
                            "crit-quality": 0.40,
                            "crit-cost": 0.35,
                            "crit-delivery": 0.25,
                        }
                    },
                },
            ],
        },
    }
}


MANUAL_CRITERIA_WEIGHTS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "description": (
            "Successful manual criteria weighting execution for the basic manual "
            "weights request."
        ),
        "value": {
            "success": True,
            "message": "Manual criteria weights executed successfully",
            "data": {
                "message": "Criteria weights computed successfully",
                "consensusMeasure": None,
                "weightsByCriterion": {
                    "crit-quality": 0.45,
                    "crit-cost": 0.325,
                    "crit-delivery": 0.225,
                },
                "collectiveEvaluations": {
                    "weightsByCriterion": {
                        "crit-quality": 0.45,
                        "crit-cost": 0.325,
                        "crit-delivery": 0.225,
                    }
                },
                "rawOutput": {
                    "useMcc": True,
                    "expertWeightsByExpert": {
                        "ana.torres@example.com": {
                            "crit-quality": 0.5,
                            "crit-cost": 0.3,
                            "crit-delivery": 0.2,
                        },
                        "luis.romero@example.com": {
                            "crit-quality": 0.4,
                            "crit-cost": 0.35,
                            "crit-delivery": 0.25,
                        },
                    },
                    "nExperts": 2,
                    "mcc": {
                        "useMcc": True,
                        "eps": 0.05,
                        "status": "Optimal",
                        "objective": 0.0,
                        "weightsByCriterion": {
                            "crit-quality": 0.45,
                            "crit-cost": 0.325,
                            "crit-delivery": 0.225,
                        },
                        "adjustedWeightsByExpert": {
                            "ana.torres@example.com": {
                                "crit-quality": 0.5,
                                "crit-cost": 0.3,
                                "crit-delivery": 0.2,
                            },
                            "luis.romero@example.com": {
                                "crit-quality": 0.4,
                                "crit-cost": 0.35,
                                "crit-delivery": 0.25,
                            },
                        },
                        "originalWeightsByExpert": {
                            "ana.torres@example.com": {
                                "crit-quality": 0.5,
                                "crit-cost": 0.3,
                                "crit-delivery": 0.2,
                            },
                            "luis.romero@example.com": {
                                "crit-quality": 0.4,
                                "crit-cost": 0.35,
                                "crit-delivery": 0.25,
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
            "message": "Error executing manual criteria weights: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}


__all__ = [
    "MANUAL_CRITERIA_WEIGHTS_REQUEST_EXAMPLES",
    "MANUAL_CRITERIA_WEIGHTS_RESPONSE_EXAMPLES",
]
