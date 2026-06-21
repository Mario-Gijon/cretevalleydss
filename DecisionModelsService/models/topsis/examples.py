from typing import Any


TOPSIS_REQUEST_EXAMPLES: dict[str, dict[str, Any]] = {
    "basic_numeric_matrix": {
        "summary": "Basic numeric matrix request",
        "value": {
            "context": {
                "issue": {
                    "id": "665f0b8f6f1e9c12a34b5600",
                    "name": "Example issue",
                    "consensusThreshold": None,
                    "consensusMaxPhases": None,
                },
                "alternatives": [
                    {
                        "id": "665f0b8f6f1e9c12a34b5672",
                        "name": "Alt 1",
                    },
                    {
                        "id": "665f0b8f6f1e9c12a34b5673",
                        "name": "Alt 2",
                    },
                ],
                "criteria": [
                    {
                        "id": "665f0b8f6f1e9c12a34b5674",
                        "name": "C1",
                        "type": "benefit",
                    },
                    {
                        "id": "665f0b8f6f1e9c12a34b5675",
                        "name": "C2",
                        "type": "cost",
                    },
                ],
                "consensusPhase": 0,
                "previousStageResult": None,
                "structure": {
                    "key": "alternativeCriteriaMatrix",
                    "stage": "alternativeEvaluation",
                },
            },
            "modelParameters": {
                "weights": {
                    "665f0b8f6f1e9c12a34b5674": 0.4,
                    "665f0b8f6f1e9c12a34b5675": 0.6,
                }
            },
            "evaluations": [
                {
                    "expert": {
                        "id": "665f0b8f6f1e9c12a34b5681",
                        "name": "Expert 1",
                        "email": "expert1@example.com",
                    },
                    "payload": {
                        "665f0b8f6f1e9c12a34b5672": {
                            "665f0b8f6f1e9c12a34b5674": {
                                "value": 0.7,
                            },
                            "665f0b8f6f1e9c12a34b5675": {
                                "value": 0.3,
                            },
                        },
                        "665f0b8f6f1e9c12a34b5673": {
                            "665f0b8f6f1e9c12a34b5674": {
                                "value": 0.9,
                            },
                            "665f0b8f6f1e9c12a34b5675": {
                                "value": 0.2,
                            },
                        },
                    },
                }
            ],
        },
    }
}


TOPSIS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "value": {
            "success": True,
            "message": "Topsis executed successfully",
            "data": {
                "rankedAlternatives": [
                    {"alternativeId": "alt-2", "name": "A2", "score": 0.6552, "rank": 1},
                    {"alternativeId": "alt-3", "name": "A3", "score": 0.5987, "rank": 2},
                    {"alternativeId": "alt-1", "name": "A1", "score": 0.4211, "rank": 3},
                ],
                "collectiveEvaluations": {
                    "alt-1": {"crit-cost": 6.5, "crit-benefit": 5.5},
                    "alt-2": {"crit-cost": 7.5, "crit-benefit": 7.5},
                },
                "plotsGraphic": {
                    "expert_points": [[-0.1187, 0.0492], [0.1187, -0.0492]],
                    "collective_point": [0.0074, -0.0031],
                },
                "consensusMeasure": None,
                "rawOutput": {"collective_ranking": [1, 2, 0]},
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing Topsis: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

__all__ = ["TOPSIS_REQUEST_EXAMPLES", "TOPSIS_RESPONSE_EXAMPLES"]
