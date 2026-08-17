from __future__ import annotations

from models.preference_order_criteria_weights.analysis import (
    analyze_issue,
)


def _criteria():
    return [
        {
            "id": "c1",
            "name": "Criterion 1",
        },
        {
            "id": "c2",
            "name": "Criterion 2",
        },
        {
            "id": "c3",
            "name": "Criterion 3",
        },
    ]


def _evaluation(
    expert_id,
    name,
    order,
):
    return {
        "expert": {
            "id": expert_id,
            "email": (
                f"{expert_id}@example.com"
            ),
            "name": name,
        },
        "payload": {
            "criterionOrder": order
        },
    }


def _execution(
    *,
    evaluations,
    raw_output,
):
    return {
        "attemptId": "attempt-1",
        "modelContext": {
            "apiModelKey": (
                "preference_order_criteria_weights"
            ),
        },
        "input": {
            "modelParameters": {},
            "evaluations": evaluations,
            "context": {
                "criteria": _criteria(),
                "structure": {
                    "key": (
                        "criteriaPreferenceOrder"
                    ),
                    "stage": (
                        "criteriaWeighting"
                    ),
                },
            },
        },
        "result": {
            "rawOutput": raw_output,
        },
    }


def _context(execution):
    return {
        "issue": {
            "id": "issue-1",
            "name": "Issue",
        },
        "decisionSpace": {},
        "participants": {},
        "semanticDirectory": {
            "expertsById": {}
        },
        "rounds": [
            {
                "phase": 1,
                "execution": execution,
            }
        ],
    }


def test_multi_expert_analysis_builds_the_agreed_five_views_and_mcc_facts():
    expert_1 = {
        "c1": 0.5,
        "c2": 1.0 / 3.0,
        "c3": 1.0 / 6.0,
    }

    expert_2 = {
        "c1": 1.0 / 3.0,
        "c2": 0.5,
        "c3": 1.0 / 6.0,
    }

    adjusted_1 = {
        "c1": 0.45,
        "c2": 0.3833333333333333,
        "c3": 1.0 / 6.0,
    }

    adjusted_2 = {
        "c1": 0.3833333333333333,
        "c2": 0.45,
        "c3": 1.0 / 6.0,
    }

    collective = {
        "c1": 0.41666666666666663,
        "c2": 0.41666666666666663,
        "c3": 1.0 / 6.0,
    }

    execution = _execution(
        evaluations=[
            _evaluation(
                "expert-1",
                "Expert 1",
                [
                    "c1",
                    "c2",
                    "c3",
                ],
            ),
            _evaluation(
                "expert-2",
                "Expert 2",
                [
                    "c2",
                    "c1",
                    "c3",
                ],
            ),
        ],
        raw_output={
            "useMcc": True,
            "nExperts": 2,
            "expertWeightsByExpert": {
                "expert-1@example.com": (
                    expert_1
                ),
                "expert-2@example.com": (
                    expert_2
                ),
            },
            "mcc": {
                "useMcc": True,
                "eps": 0.05,
                "status": "Optimal",
                "objective": 0.2,
                "weightsByCriterion": (
                    collective
                ),
                "adjustedWeightsByExpert": {
                    "expert-1@example.com": (
                        adjusted_1
                    ),
                    "expert-2@example.com": (
                        adjusted_2
                    ),
                },
                "originalWeightsByExpert": {
                    "expert-1@example.com": (
                        expert_1
                    ),
                    "expert-2@example.com": (
                        expert_2
                    ),
                },
            },
        },
    )

    analysis = analyze_issue(
        _context(execution)
    )

    assert (
        analysis[
            "facts"
        ][
            "source"
        ]
        == {
            "phase": 1,
            "nExperts": 2,
            "nCriteria": 3,
            "useMcc": True,
        }
    )

    assert (
        analysis[
            "facts"
        ][
            "criteria"
        ][
            "collectiveLeaders"
        ]
        == [
            {
                "criterionId": "c1",
                "name": "Criterion 1",
            },
            {
                "criterionId": "c2",
                "name": "Criterion 2",
            },
        ]
    )

    assert (
        analysis[
            "facts"
        ][
            "mcc"
        ][
            "available"
        ]
        is True
    )

    assert abs(
        analysis[
            "facts"
        ][
            "mcc"
        ][
            "totalAbsoluteAdjustment"
        ]
        - 0.2
    ) < 1e-9

    assert (
        analysis[
            "facts"
        ][
            "mcc"
        ][
            "maxConsensusDeviation"
        ]
        <= (
            analysis[
                "facts"
            ][
                "mcc"
            ][
                "epsilon"
            ]
            + 1e-9
        )
    )

    assert [
        item["key"]
        for item
        in analysis[
            "visualizations"
        ]
    ] == [
        "collective-criterion-importance",
        "individual-preference-distribution",
        "mcc-adjustment-map",
        "mcc-adjustment-effort-by-expert",
        "mcc-adjustment-effort-by-criterion",
    ]

    assert [
        section["id"]
        for section
        in analysis[
            "sections"
        ]
    ] == [
        "criterion-preferences-importance",
        "mcc-consensus-adjustment",
    ]

    assert (
        analysis[
            "sections"
        ][
            0
        ][
            "presentation"
        ]
        == {
            "layout": "stacked"
        }
    )

    assert (
        "Criterion preferences & importance"
        in analysis[
            "interpretation"
        ]
    )

    assert (
        "MCC consensus adjustment"
        in analysis[
            "interpretation"
        ]
    )


def test_single_expert_analysis_omits_mcc_section():
    weights = {
        "c1": 0.5,
        "c2": 1.0 / 3.0,
        "c3": 1.0 / 6.0,
    }

    execution = _execution(
        evaluations=[
            _evaluation(
                "expert-1",
                "Expert 1",
                [
                    "c1",
                    "c2",
                    "c3",
                ],
            ),
        ],
        raw_output={
            "useMcc": False,
            "nExperts": 1,
            "singleExpertKey": (
                "expert-1@example.com"
            ),
            "expertWeightsByExpert": {
                "expert-1@example.com": (
                    weights
                ),
            },
        },
    )

    analysis = analyze_issue(
        _context(execution)
    )

    assert (
        analysis[
            "facts"
        ][
            "mcc"
        ]
        == {
            "available": False,
            "reason": "single_expert",
        }
    )

    assert [
        item["key"]
        for item
        in analysis[
            "visualizations"
        ]
    ] == [
        "collective-criterion-importance",
        "individual-preference-distribution",
    ]

    assert [
        section["id"]
        for section
        in analysis[
            "sections"
        ]
    ] == [
        "criterion-preferences-importance",
    ]

    assert (
        "MCC consensus adjustment"
        not in analysis[
            "interpretation"
        ]
    )