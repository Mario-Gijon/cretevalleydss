"""Request and response examples for the AHPSort I Decision Plugin adapter."""


_LIMITING_REQUEST = {
    "context": {
        "issue": {"id": "ahpsort-i-limiting", "name": "Supplier screening"},
        "alternatives": [
            {"id": "supplier-low", "name": "Supplier below the lower boundary"},
            {"id": "supplier-high", "name": "Supplier above the upper boundary"},
        ],
        "criteria": [
            {"id": "safety", "name": "Safety"},
            {"id": "quality", "name": "Quality"},
        ],
        "structure": {
            "key": "ahpSortAlternativeProfiles",
            "stage": "alternativeEvaluation",
        },
    },
    "modelParameters": {
        "weights": {"quality": 0.65, "safety": 0.35},
        "orderedCategories": [
            {"categoryId": "high", "label": "High", "order": 2},
            {"categoryId": "low", "label": "Low", "order": 0},
            {"categoryId": "medium", "label": "Medium", "order": 1},
        ],
        "ahpSortProfiles": {
            "mode": "limiting",
            "profiles": [
                {
                    "profileId": "boundary-medium-high",
                    "lowerCategoryId": "medium",
                    "upperCategoryId": "high",
                },
                {
                    "profileId": "boundary-low-medium",
                    "lowerCategoryId": "low",
                    "upperCategoryId": "medium",
                },
            ],
        },
    },
    "evaluations": [
        {
            "expert": {"id": "expert-1", "name": "Expert One"},
            "payload": {
                "alternativeProfileComparisons": [
                    {
                        "alternativeId": alternative_id,
                        "criterionId": criterion_id,
                        "profileId": profile_id,
                        "alternativeToProfile": value,
                    }
                    for alternative_id, lower_value, upper_value in (
                        ("supplier-low", 1 / 3, 1 / 9),
                        ("supplier-high", 9, 3),
                    )
                    for criterion_id in ("quality", "safety")
                    for profile_id, value in (
                        ("boundary-low-medium", lower_value),
                        ("boundary-medium-high", upper_value),
                    )
                ],
                "profileComparisons": [
                    {
                        "criterionId": criterion_id,
                        "firstProfileId": "boundary-low-medium",
                        "secondProfileId": "boundary-medium-high",
                        "firstToSecond": 1 / 3,
                    }
                    for criterion_id in ("quality", "safety")
                ],
            },
        }
    ],
}

_CENTRAL_REQUEST = {
    "context": {
        "issue": {"id": "ahpsort-i-central", "name": "Supplier screening"},
        "alternatives": [{"id": "supplier-midpoint", "name": "Supplier M"}],
        "criteria": [{"id": "quality", "name": "Quality"}],
        "structure": {
            "key": "ahpSortAlternativeProfiles",
            "stage": "alternativeEvaluation",
        },
    },
    "modelParameters": {
        "weights": {"quality": 1.0},
        "orderedCategories": [
            {"categoryId": "low", "label": "Low", "order": 0},
            {"categoryId": "high", "label": "High", "order": 1},
        ],
        "ahpSortProfiles": {
            "mode": "central",
            "profiles": [
                {"profileId": "center-low", "categoryId": "low"},
                {"profileId": "center-high", "categoryId": "high"},
            ],
            "tiePolicy": "optimistic",
        },
    },
    "evaluations": [
        {
            "expert": {"id": "expert-1", "name": "Expert One"},
            "payload": {
                "alternativeProfileComparisons": [
                    {
                        "alternativeId": "supplier-midpoint",
                        "criterionId": "quality",
                        "profileId": "center-low",
                        "alternativeToProfile": 9,
                    },
                    {
                        "alternativeId": "supplier-midpoint",
                        "criterionId": "quality",
                        "profileId": "center-high",
                        "alternativeToProfile": 1 / 8,
                    },
                ],
                "profileComparisons": [
                    {
                        "criterionId": "quality",
                        "firstProfileId": "center-low",
                        "secondProfileId": "center-high",
                        "firstToSecond": 3,
                    }
                ],
            },
        }
    ],
}

AHPSORT_I_REQUEST_EXAMPLES = {
    "limiting_profiles": {
        "summary": "Assign alternatives using limiting profiles",
        "description": (
            "Compares two alternatives with two consecutive category boundaries. "
            "IDs, weights and category order are resolved by their identifiers."
        ),
        "value": _LIMITING_REQUEST,
    },
    "central_profiles_with_tie": {
        "summary": "Assign an alternative using central profiles",
        "description": (
            "Compares an alternative to one center per category and resolves an "
            "equal-distance assignment optimistically."
        ),
        "value": _CENTRAL_REQUEST,
    },
}

AHPSORT_I_RESPONSE_EXAMPLES = {
    "success": {
        "summary": "Successful central-profile classification",
        "description": "The alternative is assigned to the more preferred center on a tie.",
        "value": {
            "success": True,
            "message": "AHPSort I executed successfully",
            "data": {
                "categories": [
                    {"categoryId": "low", "label": "Low", "order": 0},
                    {"categoryId": "high", "label": "High", "order": 1},
                ],
                "categoryOrderSemantics": "lower-order-is-less-preferred",
                "assignments": [
                    {"alternativeId": "supplier-midpoint", "categoryId": "high"}
                ],
                "diagnostics": {
                    "modelKey": "ahp_sort_i",
                    "profileMode": "central",
                    "tiePolicy": "optimistic",
                    "resultsByAlternativeId": {
                        "supplier-midpoint": {
                            "globalPriority": 0.3333333333333334,
                            "profileGlobalPrioritiesById": {
                                "center-low": 0.22222222222222232,
                                "center-high": 0.44444444444444425,
                            },
                            "classification": {
                                "rule": "nearest_central_profile_with_explicit_tie_policy",
                                "selectedCenterProfileId": "center-high",
                                "tieDetected": True,
                                "tiedCenterProfileIds": [
                                    "center-low",
                                    "center-high",
                                ],
                                "tiePolicy": "optimistic",
                            },
                        }
                    },
                },
            },
        },
    },
    "limiting_success": {
        "summary": "Successful limiting-profile classification",
        "description": "Alternatives are assigned using ordered category boundaries.",
        "value": {
            "success": True,
            "message": "AHPSort I executed successfully",
            "data": {
                "categories": [
                    {"categoryId": "low", "label": "Low", "order": 0},
                    {"categoryId": "medium", "label": "Medium", "order": 1},
                    {"categoryId": "high", "label": "High", "order": 2},
                ],
                "categoryOrderSemantics": "lower-order-is-less-preferred",
                "assignments": [
                    {"alternativeId": "supplier-low", "categoryId": "low"},
                    {"alternativeId": "supplier-high", "categoryId": "high"},
                ],
                "diagnostics": {
                    "modelKey": "ahp_sort_i",
                    "profileMode": "limiting",
                    "resultsByAlternativeId": {
                        "supplier-low": {
                            "globalPriority": 0.0769230769230769,
                            "profileGlobalPrioritiesById": {
                                "boundary-low-medium": 0.23076923076923078,
                                "boundary-medium-high": 0.6923076923076924,
                            },
                            "classification": {
                                "rule": "ordered_limiting_profiles_equal_goes_to_more_preferred_category"
                            },
                        },
                        "supplier-high": {
                            "globalPriority": 0.6923076923076925,
                            "profileGlobalPrioritiesById": {
                                "boundary-low-medium": 0.07692307692307693,
                                "boundary-medium-high": 0.23076923076923073,
                            },
                            "classification": {
                                "rule": "ordered_limiting_profiles_equal_goes_to_more_preferred_category"
                            },
                        },
                    },
                },
            },
        },
    },
}

__all__ = ["AHPSORT_I_REQUEST_EXAMPLES", "AHPSORT_I_RESPONSE_EXAMPLES"]
