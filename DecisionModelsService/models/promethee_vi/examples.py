from typing import Any

PROMETHEE_VI_REQUEST_EXAMPLES: dict[str, dict[str, Any]] = {
    "basic_numeric_matrix": {
        "summary": "Basic numeric matrix request",
        "description": (
            "Executes PROMETHEE VI with three alternatives, three criteria, two "
            "experts, numeric ratings, per-criterion thresholds, preference "
            "functions, and lower/upper weight bounds."
        ),
        "value": {
            "context": {
                "issue": {
                    "id": "issue-promethee-vi-001",
                    "name": "Supplier selection with PROMETHEE VI",
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
                    "key": "alternativeCriteriaMatrix",
                    "stage": "alternativeEvaluation",
                },
            },
            "modelParameters": {
                "q": {
                    "crit-quality": 0.1,
                    "crit-cost": 0.1,
                    "crit-delivery": 0.1,
                },
                "s": {
                    "crit-quality": 0.2,
                    "crit-cost": 0.2,
                    "crit-delivery": 0.2,
                },
                "p": {
                    "crit-quality": 0.4,
                    "crit-cost": 0.4,
                    "crit-delivery": 0.4,
                },
                "f": {
                    "crit-quality": "t5",
                    "crit-cost": "t5",
                    "crit-delivery": "t5",
                },
                "w_lower": {
                    "crit-quality": 0.30,
                    "crit-cost": 0.25,
                    "crit-delivery": 0.15,
                },
                "w_upper": {
                    "crit-quality": 0.50,
                    "crit-cost": 0.45,
                    "crit-delivery": 0.30,
                },
                "iterations": 100,
            },
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


PROMETHEE_VI_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "description": "Successful PROMETHEE VI execution for the basic numeric matrix request.",
        "value": {
            "success": True,
            "message": "PROMETHEE VI executed successfully",
            "data": {
                "rankedAlternatives": [
                    {
                        "alternativeId": "alt-supplier-c",
                        "name": "Supplier C",
                        "score": 0.43345520438347457,
                        "rank": 1,
                    },
                    {
                        "alternativeId": "alt-supplier-a",
                        "name": "Supplier A",
                        "score": -0.18580497338190985,
                        "rank": 2,
                    },
                    {
                        "alternativeId": "alt-supplier-b",
                        "name": "Supplier B",
                        "score": -0.24765023100156444,
                        "rank": 3,
                    },
                ],
                "collectiveEvaluations": {
                    "alt-supplier-a": {
                        "crit-quality": 7.5,
                        "crit-cost": 6.0,
                        "crit-delivery": 7.5,
                    },
                    "alt-supplier-b": {
                        "crit-quality": 7.5,
                        "crit-cost": 4.5,
                        "crit-delivery": 8.5,
                    },
                    "alt-supplier-c": {
                        "crit-quality": 9.0,
                        "crit-cost": 7.5,
                        "crit-delivery": 6.5,
                    },
                },
                "plotsGraphic": {
                    "expert_points": [
                        [1.3331, 0.001],
                        [-1.2713, -0.4013],
                    ],
                    "collective_point": [-0.0206, 0.1334],
                },
                "consensusMeasure": None,
                "rawOutput": {
                    "collective_matrix": [
                        [7.5, 6.0, 7.5],
                        [7.5, 4.5, 8.5],
                        [9.0, 7.5, 6.5],
                    ],
                    "matrix_used": [
                        [7.5, 6.0, 7.5],
                        [7.5, 4.5, 8.5],
                        [9.0, 7.5, 6.5],
                    ],
                    "minus_ranking": [
                        [3.0, 0.5714285714285714],
                        [1.0, -0.2142857142857143],
                        [2.0, -0.35714285714285715],
                    ],
                    "favorable_ranking": [
                        [3.0, 0.43345520438347457],
                        [1.0, -0.18580497338190985],
                        [2.0, -0.24765023100156444],
                    ],
                    "plus_ranking": [
                        [3.0, 0.52],
                        [1.0, -0.2],
                        [2.0, -0.32000000000000006],
                    ],
                    "plots_graphic": {
                        "expert_points": [
                            [1.3331, 0.001],
                            [-1.2713, -0.4013],
                        ],
                        "collective_point": [-0.0206, 0.1334],
                    },
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing PROMETHEE VI: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

__all__ = ["PROMETHEE_VI_REQUEST_EXAMPLES", "PROMETHEE_VI_RESPONSE_EXAMPLES"]
