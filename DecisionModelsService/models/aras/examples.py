from typing import Any


NUMERIC_MATRIX_DOMAIN: dict[str, Any] = {
    "name": "Numeric 0-10",
    "typeKey": "numericContinuous",
    "definition": {
        "min": 0.0,
        "max": 10.0,
    },
}

ARAS_REQUEST_EXAMPLES: dict[str, dict[str, Any]] = {
    "basic_numeric_matrix": {
        "summary": "Basic numeric matrix request",
        "description": (
            "Executes ARAS with three alternatives, three criteria, two experts, "
            "numeric ratings, criterion weights, and benefit/cost criterion types."
        ),
        "value": {
            "context": {
                "issue": {
                    "id": "issue-aras-001",
                    "name": "Supplier selection with ARAS",
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
                        "expressionDomain": NUMERIC_MATRIX_DOMAIN,
                    },
                    {
                        "id": "crit-cost",
                        "name": "Cost",
                        "type": "cost",
                        "expressionDomain": NUMERIC_MATRIX_DOMAIN,
                    },
                    {
                        "id": "crit-delivery",
                        "name": "Delivery reliability",
                        "type": "benefit",
                        "expressionDomain": NUMERIC_MATRIX_DOMAIN,
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
                }
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
                            "crit-quality": 8.0,
                            "crit-cost": 6.0,
                            "crit-delivery": 7.0,
                        },
                        "alt-supplier-b": {
                            "crit-quality": 7.0,
                            "crit-cost": 5.0,
                            "crit-delivery": 8.0,
                        },
                        "alt-supplier-c": {
                            "crit-quality": 9.0,
                            "crit-cost": 8.0,
                            "crit-delivery": 6.0,
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
                            "crit-quality": 7.0,
                            "crit-cost": 6.0,
                            "crit-delivery": 8.0,
                        },
                        "alt-supplier-b": {
                            "crit-quality": 8.0,
                            "crit-cost": 4.0,
                            "crit-delivery": 9.0,
                        },
                        "alt-supplier-c": {
                            "crit-quality": 9.0,
                            "crit-cost": 7.0,
                            "crit-delivery": 7.0,
                        },
                    },
                },
            ],
        },
    }
}


ARAS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "description": "Successful ARAS execution for the basic numeric matrix request.",
        "value": {
            "success": True,
            "message": "Aras executed successfully",
            "data": {
                "rankedAlternatives": [
                    {
                        "alternativeId": "alt-supplier-b",
                        "name": "Supplier B",
                        "score": 0.92747736213599,
                        "rank": 1,
                    },
                    {
                        "alternativeId": "alt-supplier-a",
                        "name": "Supplier A",
                        "score": 0.811995158174073,
                        "rank": 2,
                    },
                    {
                        "alternativeId": "alt-supplier-c",
                        "name": "Supplier C",
                        "score": 0.8060786641526416,
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
                        0.811995158174073,
                        0.92747736213599,
                        0.8060786641526416,
                    ],
                    "collective_ranking": [1, 0, 2],
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
            "message": "Error executing Aras: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

__all__ = ["ARAS_REQUEST_EXAMPLES", "ARAS_RESPONSE_EXAMPLES"]
