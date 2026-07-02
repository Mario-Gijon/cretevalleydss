from typing import Any


FUZZY_LINGUISTIC_DOMAIN: dict[str, Any] = {
    "type": "linguistic",
    "linguisticLabels": [
        {
            "label": "Very Low",
            "values": [0.0, 0.1, 0.3],
        },
        {
            "label": "Low",
            "values": [0.1, 0.3, 0.5],
        },
        {
            "label": "Medium",
            "values": [0.3, 0.5, 0.7],
        },
        {
            "label": "High",
            "values": [0.5, 0.7, 0.9],
        },
        {
            "label": "Very High",
            "values": [0.7, 0.9, 1.0],
        },
    ],
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
                                "value": "High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                            "crit-cost": {
                                "value": "Medium",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                            "crit-delivery": {
                                "value": "High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                        },
                        "alt-supplier-b": {
                            "crit-quality": {
                                "value": "High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                            "crit-cost": {
                                "value": "Low",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                            "crit-delivery": {
                                "value": "Very High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                        },
                        "alt-supplier-c": {
                            "crit-quality": {
                                "value": "Very High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                            "crit-cost": {
                                "value": "High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                            "crit-delivery": {
                                "value": "Medium",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
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
                                "value": "High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                            "crit-cost": {
                                "value": "Medium",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                            "crit-delivery": {
                                "value": "Very High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                        },
                        "alt-supplier-b": {
                            "crit-quality": {
                                "value": "Very High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                            "crit-cost": {
                                "value": "Low",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                            "crit-delivery": {
                                "value": "Very High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                        },
                        "alt-supplier-c": {
                            "crit-quality": {
                                "value": "Very High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                            "crit-cost": {
                                "value": "High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
                            },
                            "crit-delivery": {
                                "value": "High",
                                "expressionDomain": FUZZY_LINGUISTIC_DOMAIN,
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
                        "score": 0.8915038936910458,
                        "rank": 1,
                    },
                    {
                        "alternativeId": "alt-supplier-a",
                        "name": "Supplier A",
                        "score": 0.2175417131513139,
                        "rank": 2,
                    },
                    {
                        "alternativeId": "alt-supplier-c",
                        "name": "Supplier C",
                        "score": 0.21699221261790844,
                        "rank": 3,
                    },
                ],
                "collectiveEvaluations": {
                    "alt-supplier-a": {
                        "crit-quality": [0.5, 0.7, 0.9],
                        "crit-cost": [0.3, 0.5, 0.7],
                        "crit-delivery": [0.6, 0.8, 0.95],
                    },
                    "alt-supplier-b": {
                        "crit-quality": [0.6, 0.8, 0.95],
                        "crit-cost": [0.1, 0.3, 0.5],
                        "crit-delivery": [0.7, 0.9, 1.0],
                    },
                    "alt-supplier-c": {
                        "crit-quality": [0.7, 0.9, 1.0],
                        "crit-cost": [0.5, 0.7, 0.9],
                        "crit-delivery": [0.4, 0.6, 0.8],
                    },
                },
                "plotsGraphic": {
                    "expert_points": [
                        [0.1558, 0.0001],
                        [-0.1485, -0.0469],
                    ],
                    "collective_point": [-0.0024, 0.0156],
                },
                "consensusMeasure": None,
                "rawOutput": {
                    "collective_matrix": [
                        [
                            [0.5, 0.7, 0.9],
                            [0.3, 0.5, 0.7],
                            [0.6, 0.8, 0.95],
                        ],
                        [
                            [0.6, 0.8, 0.95],
                            [0.1, 0.3, 0.5],
                            [0.7, 0.9, 1.0],
                        ],
                        [
                            [0.7, 0.9, 1.0],
                            [0.5, 0.7, 0.9],
                            [0.4, 0.6, 0.8],
                        ],
                    ],
                    "collective_scores": [
                        0.2175417131513139,
                        0.8915038936910458,
                        0.21699221261790844,
                    ],
                    "collective_ranking": [1, 0, 2],
                    "plots_graphic": {
                        "expert_points": [
                            [0.1558, 0.0001],
                            [-0.1485, -0.0469],
                        ],
                        "collective_point": [-0.0024, 0.0156],
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