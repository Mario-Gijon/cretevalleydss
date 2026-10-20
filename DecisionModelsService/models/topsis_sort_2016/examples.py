"""Request and response examples for the TOPSIS-Sort 2016 plugin adapter."""

NUMERIC_EXPRESSION_DOMAIN = {
    "name": "Numeric 0-10",
    "typeKey": "numericContinuous",
    "definition": {"min": 0.0, "max": 10.0},
}

_REQUEST = {
    "context": {
        "issue": {
            "id": "issue-topsis-sort-001",
            "name": "Supplier category assignment",
            "consensusThreshold": None,
            "consensusMaxPhases": None,
        },
        "alternatives": [
            {"id": "alt-a", "name": "Supplier A"},
            {"id": "alt-b", "name": "Supplier B"},
            {"id": "alt-c", "name": "Supplier C"},
        ],
        "criteria": [
            {
                "id": "quality",
                "name": "Quality",
                "type": "benefit",
                "expressionDomain": NUMERIC_EXPRESSION_DOMAIN,
            },
            {
                "id": "cost",
                "name": "Cost",
                "type": "cost",
                "expressionDomain": NUMERIC_EXPRESSION_DOMAIN,
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
        "weights": {"quality": 0.65, "cost": 0.35},
        "orderedCategories": [
            {"categoryId": "low", "label": "Low", "order": 0},
            {"categoryId": "middle", "label": "Middle", "order": 1},
            {"categoryId": "high", "label": "High", "order": 2},
        ],
        "boundaryProfiles": {
            "profiles": [
                {
                    "profileId": "profile-mid",
                    "categoryId": "middle",
                    "valuesByCriterionId": {"quality": 4.0, "cost": 7.0},
                },
                {
                    "profileId": "profile-high",
                    "categoryId": "high",
                    "valuesByCriterionId": {"quality": 7.0, "cost": 5.0},
                },
            ]
        },
    },
    "evaluations": [
        {
            "expert": {
                "id": "expert-1",
                "name": "Expert One",
                "email": "expert-one@example.com",
            },
            "payload": {
                "alt-a": {"quality": 8.0, "cost": 6.0},
                "alt-b": {"quality": 6.0, "cost": 3.0},
                "alt-c": {"quality": 3.0, "cost": 8.0},
            },
        }
    ],
}

TOPSIS_SORT_2016_REQUEST_EXAMPLES = {
    "numeric_benefit_cost_sorting": {
        "summary": "Numerical alternatives assigned to ordered categories",
        "description": (
            "Uses numeric benefit and cost criteria, criterion weights, three "
            "ordered categories, and two limiting profiles."
        ),
        "value": _REQUEST,
    }
}

TOPSIS_SORT_2016_RESPONSE_EXAMPLES = {
    "success": {
        "summary": "Successful category assignment",
        "description": "TOPSIS-Sort assigns each supplier to one category.",
        "value": {
            "success": True,
            "message": "TOPSIS-Sort 2016 executed successfully",
            "data": {
                "categories": [
                    {"categoryId": "low", "label": "Low", "order": 0},
                    {"categoryId": "middle", "label": "Middle", "order": 1},
                    {"categoryId": "high", "label": "High", "order": 2},
                ],
                "categoryOrderSemantics": "lower-order-is-less-preferred",
                "assignments": [
                    {"alternativeId": "alt-a", "categoryId": "high"},
                    {"alternativeId": "alt-b", "categoryId": "middle"},
                    {"alternativeId": "alt-c", "categoryId": "low"},
                ],
            },
            "error": None,
        },
    },
    "error": {
        "summary": "Execution error",
        "value": {
            "success": False,
            "message": "Error executing TOPSIS-Sort 2016: <reason>",
            "data": None,
            "error": {"code": "INTERNAL_ERROR", "field": None, "details": None},
        },
    },
}

__all__ = [
    "NUMERIC_EXPRESSION_DOMAIN",
    "TOPSIS_SORT_2016_REQUEST_EXAMPLES",
    "TOPSIS_SORT_2016_RESPONSE_EXAMPLES",
]
