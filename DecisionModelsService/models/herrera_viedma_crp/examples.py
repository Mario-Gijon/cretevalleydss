from typing import Any


HERRERA_VIEDMA_CRP_REQUEST_EXAMPLES: dict[str, dict[str, Any]] = {
    "basic_pairwise_consensus": {
        "summary": "Basic pairwise consensus request",
        "description": (
            "Executes Herrera-Viedma CRP with three alternatives, one global "
            "pairwise criterion, two experts, and consensus parameters. Each expert "
            "provides a complete off-diagonal pairwise preference matrix."
        ),
        "value": {
            "context": {
                "issue": {
                    "id": "issue-herrera-viedma-001",
                    "name": "Supplier consensus with Herrera-Viedma CRP",
                    "consensusThreshold": 0.8,
                    "consensusMaxPhases": 3,
                },
                "alternatives": [
                    {"id": "alt-supplier-a", "name": "Supplier A"},
                    {"id": "alt-supplier-b", "name": "Supplier B"},
                    {"id": "alt-supplier-c", "name": "Supplier C"},
                ],
                "criteria": [
                    {
                        "id": "crit-overall",
                        "name": "Overall preference",
                    }
                ],
                "consensusPhase": 0,
                "previousStageResult": None,
                "structure": {
                    "key": "alternativePairwiseByCriterion",
                    "stage": "alternativeEvaluation",
                },
            },
            "modelParameters": {
                "ag_lq": [0.3, 0.8],
                "ex_lq": [0.5, 1.0],
                "b": 1,
                "beta": 0.8,
            },
            "evaluations": [
                {
                    "expert": {
                        "id": "expert-ana",
                        "name": "Ana Torres",
                        "email": "ana.torres@example.com",
                    },
                    "payload": {
                        "crit-overall": {
                            "alt-supplier-a": {
                                "alt-supplier-b": {"value": 0.35},
                                "alt-supplier-c": {"value": 0.70},
                            },
                            "alt-supplier-b": {
                                "alt-supplier-a": {"value": 0.65},
                                "alt-supplier-c": {"value": 0.80},
                            },
                            "alt-supplier-c": {
                                "alt-supplier-a": {"value": 0.30},
                                "alt-supplier-b": {"value": 0.20},
                            },
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
                        "crit-overall": {
                            "alt-supplier-a": {
                                "alt-supplier-b": {"value": 0.55},
                                "alt-supplier-c": {"value": 0.75},
                            },
                            "alt-supplier-b": {
                                "alt-supplier-a": {"value": 0.45},
                                "alt-supplier-c": {"value": 0.60},
                            },
                            "alt-supplier-c": {
                                "alt-supplier-a": {"value": 0.25},
                                "alt-supplier-b": {"value": 0.40},
                            },
                        }
                    },
                },
            ],
        },
    }
}


HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "success": {
        "summary": "Successful execution",
        "description": (
            "Successful Herrera-Viedma CRP execution for the basic pairwise "
            "consensus request."
        ),
        "value": {
            "success": True,
            "message": "Herrera Viedma CRP executed successfully",
            "data": {
                "rankedAlternatives": [
                    {
                        "alternativeId": "alt-supplier-b",
                        "name": "Supplier B",
                        "score": 0.5099,
                        "rank": 1,
                    },
                    {
                        "alternativeId": "alt-supplier-a",
                        "name": "Supplier A",
                        "score": 0.4531,
                        "rank": 2,
                    },
                    {
                        "alternativeId": "alt-supplier-c",
                        "name": "Supplier C",
                        "score": 0.2733,
                        "rank": 3,
                    },
                ],
                "collectiveEvaluations": {
                    "crit-overall": {
                        "alt-supplier-a": {
                            "alt-supplier-b": 0.43,
                            "alt-supplier-c": 0.72,
                        },
                        "alt-supplier-b": {
                            "alt-supplier-a": 0.53,
                            "alt-supplier-c": 0.68,
                        },
                        "alt-supplier-c": {
                            "alt-supplier-a": 0.27,
                            "alt-supplier-b": 0.28,
                        },
                    }
                },
                "plotsGraphic": {
                    "expert_points": [
                        [0.2075, -0.0159],
                        [-0.1927, -0.0786],
                    ],
                    "collective_point": [-0.0049, 0.0315],
                },
                "consensusMeasure": 0.85,
                "rawOutput": {
                    "alternatives_rankings": [
                        [1, 0, 2],
                        [0, 1, 2],
                        [1, 0, 2],
                    ],
                    "cm": 0.85,
                    "collective_scores": [0.4531, 0.5099, 0.2733],
                    "collective_evaluations": {
                        "crit-overall": [
                            [0.5, 0.43, 0.72],
                            [0.53, 0.5, 0.68],
                            [0.27, 0.28, 0.5],
                        ]
                    },
                    "plots_graphic": {
                        "expert_points": [
                            [0.2075, -0.0159],
                            [-0.1927, -0.0786],
                        ],
                        "collective_point": [-0.0049, 0.0315],
                    },
                    "suggested_next_evaluations": {},
                    "diagnostics": {
                        "expert_rankings": [
                            [1, 0, 2],
                            [0, 1, 2],
                        ],
                        "collective_ranking": [1, 0, 2],
                        "differences_rankings": [
                            [0, 0, 0],
                            [1, -1, 0],
                        ],
                        "consensus_degree_exp_alt": [
                            [0.0, 0.0, 0.0],
                            [0.5, 0.5, 0.0],
                        ],
                        "consensus_degree_alt": [0.75, 0.75, 1.0],
                        "solution_set": [1],
                        "proximity_measures": [],
                        "farthest_experts": [],
                        "changes": {},
                    },
                },
            },
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing Herrera Viedma CRP: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}


__all__ = [
    "HERRERA_VIEDMA_CRP_REQUEST_EXAMPLES",
    "HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES",
]