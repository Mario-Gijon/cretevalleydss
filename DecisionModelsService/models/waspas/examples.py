from typing import Any

WASPAS_REQUEST_EXAMPLES: dict[str, dict[str, Any]] = {
    "basic_numeric_matrix": {
        "summary": "Basic numeric matrix request",
        "description": (
            "Executes WASPAS with three alternatives, three criteria, two experts, "
            "numeric ratings, criterion weights, benefit/cost criterion types, "
            "and the lambda coefficient."
        ),
        "value": {
            "context": {
                "issue": {
                    "id": "issue-waspas-001",
                    "name": "Supplier selection with WASPAS",
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
            "modelParameters": {
                "weights": {
                    "crit-quality": 0.45,
                    "crit-cost": 0.35,
                    "crit-delivery": 0.20,
                },
                "lambda": 0.5,
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


WASPAS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "description": "Successful WASPAS execution for the basic numeric matrix request.",
        "value": {
            "success": True,
            "message": "WASPAS executed successfully",
            "data": {
                "rankedAlternatives": [
                    {
                        "alternativeId": "alt-supplier-b",
                        "name": "Supplier B",
                        "score": 1.5070428479728124,
                        "rank": 1,
                    },
                    {
                        "alternativeId": "alt-supplier-c",
                        "name": "Supplier C",
                        "score": 1.4080201283771978,
                        "rank": 2,
                    },
                    {
                        "alternativeId": "alt-supplier-a",
                        "name": "Supplier A",
                        "score": 1.262413917269534,
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
                    "collective_scores": [
                        1.262413917269534,
                        1.5070428479728124,
                        1.4080201283771978,
                    ],
                    "collective_ranking": [1, 2, 0],
                    "wsm_scores": [
                        1.275,
                        1.5499999999999998,
                        1.45,
                    ],
                    "wpm_scores": [
                        1.2498278345390679,
                        1.464085695945625,
                        1.3660402567543954,
                    ],
                    "waspas_scores": [
                        1.262413917269534,
                        1.5070428479728124,
                        1.4080201283771978,
                    ],
                    "lambda": 0.5,
                    "weights_used": [0.45, 0.35, 0.2],
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
            "message": "Error executing WASPAS: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}


__all__ = ["WASPAS_REQUEST_EXAMPLES", "WASPAS_RESPONSE_EXAMPLES"]
