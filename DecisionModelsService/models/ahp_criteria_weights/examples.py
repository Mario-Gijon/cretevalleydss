"""Minimal API examples for AHP criteria weighting."""

AHP_CRITERIA_WEIGHTS_REQUEST_EXAMPLES = {
    "two_criteria": {
        "summary": "Two criteria",
        "description": "AHP request with one complete comparison and one expert.",
        "value": {
            "modelParameters": {},
            "evaluations": [
                {
                    "expert": {"id": "expert-1", "name": "Expert 1"},
                    "payload": {
                        "comparisons": [
                            {
                                "criterionId": "quality",
                                "comparedCriterionId": "cost",
                                "value": 3,
                            }
                        ]
                    },
                }
            ],
            "context": {
                "criteria": [
                    {"id": "quality", "name": "Quality"},
                    {"id": "cost", "name": "Cost"},
                ],
                "structure": {"key": "criteriaPairwiseAHP", "stage": "criteriaWeighting"},
            },
        },
    }
}

AHP_CRITERIA_WEIGHTS_RESPONSE_EXAMPLES = {
    "success": {
        "summary": "Successful execution",
        "description": "Successful AHP execution for the two-criteria request.",
        "value": {
            "success": True,
            "message": "AHP criteria weights executed successfully",
            "data": {
                "message": "AHP criterion weights computed successfully",
                "consensusMeasure": None,
                "weightsByCriterion": {"quality": 0.75, "cost": 0.25},
                "collectiveEvaluations": {
                    "weightsByCriterion": {"quality": 0.75, "cost": 0.25},
                    "expertWeightsByExpert": {
                        "expert-1": {"quality": 0.75, "cost": 0.25}
                    },
                    "expertDiagnosticsByExpert": {
                        "expert-1": {
                            "consistencyRatio": None,
                            "consistencyStatus": "not_applicable",
                        }
                    },
                    "aggregation": {
                        "method": "singleExpert",
                        "singleExpertKey": "expert-1",
                    },
                },
                "rawOutput": {"priorityMethod": "principalEigenvector"},
            },
        },
    }
}
