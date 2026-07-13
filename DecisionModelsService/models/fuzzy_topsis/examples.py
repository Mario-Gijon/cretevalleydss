from typing import Any


FUZZY_LINGUISTIC_DOMAIN: dict[str, Any] = {
    "name": "Triangular fuzzy linguistic",
    "typeKey": "linguisticFuzzy",
    "definition": {
        "membershipFunction": "triangular",
        "labelCount": 5,
        "labels": [
            {
                "key": "very_low",
                "label": "Very Low",
                "index": 0,
                "values": [0, 0, 0.25],
            },
            {
                "key": "low",
                "label": "Low",
                "index": 1,
                "values": [0, 0.25, 0.5],
            },
            {
                "key": "medium",
                "label": "Medium",
                "index": 2,
                "values": [0.25, 0.5, 0.75],
            },
            {
                "key": "high",
                "label": "High",
                "index": 3,
                "values": [0.5, 0.75, 1],
            },
            {
                "key": "very_high",
                "label": "Very High",
                "index": 4,
                "values": [0.75, 1, 1],
            },
        ],
    },
}


FUZZY_TOPSIS_REQUEST_EXAMPLES: dict[str, dict[str, Any]] = {
    "basic_linguistic_matrix": {
        "summary": "Basic linguistic matrix request",
        "description": (
            "Executes Fuzzy TOPSIS with three alternatives, three criteria, two experts, "
            "linguistic ratings resolved to fuzzy triplets, fuzzy criterion weights, "
            "and benefit/cost criterion types."
        ),
        "value": {
            "context": {
                "issue": {
                    "id": "issue-fuzzy-topsis-001",
                    "name": "Supplier selection with Fuzzy TOPSIS",
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
                        "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                    },
                    {
                        "id": "crit-cost",
                        "name": "Cost",
                        "type": "cost",
                        "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                    },
                    {
                        "id": "crit-delivery",
                        "name": "Delivery reliability",
                        "type": "benefit",
                        "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
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
                    "crit-quality": [0.35, 0.45, 0.55],
                    "crit-cost": [0.25, 0.35, 0.45],
                    "crit-delivery": [0.10, 0.20, 0.30],
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
                            "crit-quality": {
                                "value": {"labelKey": "high"},
                            },
                            "crit-cost": {
                                "value": {"labelKey": "medium"},
                            },
                            "crit-delivery": {
                                "value": {"labelKey": "high"},
                            },
                        },
                        "alt-supplier-b": {
                            "crit-quality": {
                                "value": {"labelKey": "high"},
                            },
                            "crit-cost": {
                                "value": {"labelKey": "low"},
                            },
                            "crit-delivery": {
                                "value": {"labelKey": "very_high"},
                            },
                        },
                        "alt-supplier-c": {
                            "crit-quality": {
                                "value": {"labelKey": "very_high"},
                            },
                            "crit-cost": {
                                "value": {"labelKey": "high"},
                            },
                            "crit-delivery": {
                                "value": {"labelKey": "medium"},
                            },
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
                            "crit-quality": {
                                "value": {"labelKey": "high"},
                            },
                            "crit-cost": {
                                "value": {"labelKey": "medium"},
                            },
                            "crit-delivery": {
                                "value": {"labelKey": "very_high"},
                            },
                        },
                        "alt-supplier-b": {
                            "crit-quality": {
                                "value": {"labelKey": "very_high"},
                            },
                            "crit-cost": {
                                "value": {"labelKey": "low"},
                            },
                            "crit-delivery": {
                                "value": {"labelKey": "very_high"},
                            },
                        },
                        "alt-supplier-c": {
                            "crit-quality": {
                                "value": {"labelKey": "very_high"},
                            },
                            "crit-cost": {
                                "value": {"labelKey": "high"},
                            },
                            "crit-delivery": {
                                "value": {"labelKey": "high"},
                            },
                        },
                    },
                },
            ],
        },
    }
}


FUZZY_TOPSIS_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "description": "Successful Fuzzy TOPSIS execution for the basic linguistic matrix request.",
        "value": {
            "success": True,
            "message": "Fuzzy TOPSIS executed successfully",
            "data": {
                "rankedAlternatives": [
                    {
                        "alternativeId": "alt-supplier-b",
                        "name": "Supplier B",
                        "score": 0.869395780893392,
                        "rank": 1,
                    },
                    {
                        "alternativeId": "alt-supplier-a",
                        "name": "Supplier A",
                        "score": 0.4060549417580124,
                        "rank": 2,
                    },
                    {
                        "alternativeId": "alt-supplier-c",
                        "name": "Supplier C",
                        "score": 0.261208438213216,
                        "rank": 3,
                    },
                ],
                "collectiveEvaluations": {
                    "alt-supplier-a": {
                        "crit-quality": [0.5, 0.75, 1.0],
                        "crit-cost": [0.25, 0.5, 0.75],
                        "crit-delivery": [0.625, 0.875, 1.0],
                    },
                    "alt-supplier-b": {
                        "crit-quality": [0.625, 0.875, 1.0],
                        "crit-cost": [0.0, 0.25, 0.5],
                        "crit-delivery": [0.75, 1.0, 1.0],
                    },
                    "alt-supplier-c": {
                        "crit-quality": [0.75, 1.0, 1.0],
                        "crit-cost": [0.5, 0.75, 1.0],
                        "crit-delivery": [0.375, 0.625, 0.875],
                    },
                },
                "plotsGraphic": {
                    "expert_points": [
                        [0.1731, 0.0001],
                        [-0.1651, -0.0521],
                    ],
                    "collective_point": [-0.0027, 0.0173],
                },
                "consensusMeasure": None,
                "rawOutput": {
                    "collective_matrix": [
                        [
                            [0.5, 0.75, 1.0],
                            [0.25, 0.5, 0.75],
                            [0.625, 0.875, 1.0],
                        ],
                        [
                            [0.625, 0.875, 1.0],
                            [0.0, 0.25, 0.5],
                            [0.75, 1.0, 1.0],
                        ],
                        [
                            [0.75, 1.0, 1.0],
                            [0.5, 0.75, 1.0],
                            [0.375, 0.625, 0.875],
                        ],
                    ],
                    "collective_scores": [
                        0.4060549417580124,
                        0.869395780893392,
                        0.261208438213216,
                    ],
                    "collective_ranking": [1, 0, 2],
                    "plots_graphic": {
                        "expert_points": [
                            [0.1731, 0.0001],
                            [-0.1651, -0.0521],
                        ],
                        "collective_point": [-0.0027, 0.0173],
                    },
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing Fuzzy TOPSIS: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}


__all__ = [
    "FUZZY_LINGUISTIC_DOMAIN",
    "FUZZY_TOPSIS_REQUEST_EXAMPLES",
    "FUZZY_TOPSIS_RESPONSE_EXAMPLES",
]
