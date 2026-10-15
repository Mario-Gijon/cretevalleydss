from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path

import pytest

from models.preference_order_criteria_weights.analysis import (
    analyze_issue,
)
from models.preference_order_criteria_weights.analysis.interpretation import (
    build_interpretation,
)
from models.preference_order_criteria_weights.executor import (
    execute_preference_order_criteria_weights,
)
from schemas.model_requests import GenericModelExecutionRequest


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


def _execute_request(request: dict) -> dict:
    response = execute_preference_order_criteria_weights(
        GenericModelExecutionRequest.model_validate(request)
    )
    assert response["success"] is True
    return analyze_issue(
        {
            "issue": request["context"]["issue"],
            "rounds": [
                {
                    "phase": 1,
                    "execution": {
                        "modelContext": {
                            "apiModelKey": "preference_order_criteria_weights",
                        },
                        "input": request,
                        "result": {
                            "rawOutput": response["data"]["rawOutput"],
                        },
                    },
                }
            ],
        }
    )


def _greece_request() -> dict:
    fixture_path = (
        Path(__file__).resolve().parents[3]
        / "Automation"
        / "issue_scenario_lab"
        / "data"
        / "topsis_2tuple_greece.json"
    )
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    return {
        "context": {
            "issue": {
                "id": "greece-mcc-fixture",
                "name": fixture["issue"]["name"],
            },
            "criteria": [
                {"id": item["key"], "name": item["name"]}
                for item in fixture["criteria"]
            ],
            "structure": {
                "key": "criteriaPreferenceOrder",
                "stage": "criteriaWeighting",
            },
        },
        "modelParameters": {},
        "evaluations": [
            {
                "expert": {
                    "id": alias,
                    "email": f"{alias}@example.test",
                    "name": f"Expert {alias[-1].upper()}",
                },
                "payload": {"criterionOrder": order},
            }
            for alias, order in fixture["criteriaWeighting"]["rankings"].items()
        ],
    }


def _split_priorities_request() -> dict:
    """A small test-only case; its MCC output is produced by the real executor."""
    return {
        "context": {
            "issue": {"id": "split-priorities", "name": "Split priorities"},
            "criteria": _criteria(),
            "structure": {
                "key": "criteriaPreferenceOrder",
                "stage": "criteriaWeighting",
            },
        },
        "modelParameters": {},
        "evaluations": [
            _evaluation("expert-1", "Expert 1", ["c1", "c2", "c3"]),
            _evaluation("expert-2", "Expert 2", ["c2", "c1", "c3"]),
        ],
    }


def _same_priorities_request() -> dict:
    return {
        "context": {
            "issue": {"id": "same-priorities", "name": "Same priorities"},
            "criteria": _criteria(),
            "structure": {
                "key": "criteriaPreferenceOrder",
                "stage": "criteriaWeighting",
            },
        },
        "modelParameters": {},
        "evaluations": [
            _evaluation("expert-1", "Expert 1", ["c1", "c2", "c3"]),
            _evaluation("expert-2", "Expert 2", ["c1", "c2", "c3"]),
        ],
    }


@pytest.fixture(scope="module")
def greece_execution() -> dict:
    return _execute_request(_greece_request())


@pytest.fixture(scope="module")
def split_priorities_execution() -> dict:
    return _execute_request(_split_priorities_request())


@pytest.fixture(scope="module")
def same_priorities_execution() -> dict:
    return _execute_request(_same_priorities_request())


def test_multi_expert_analysis_builds_preference_and_mcc_views_with_facts():
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

    assert {
        item["criterionId"]: item["collectiveWeight"]
        for item in analysis["facts"]["criteria"]["items"]
    } == collective

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
        "individual-preference-distribution",
        "collective-criterion-importance",
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

    assert all(
        section["visualizations"]
        for section in analysis["sections"]
    )
    assert analysis["sections"][0]["title"] == (
        "Criterion preferences and collective weights"
    )
    assert analysis["sections"][0]["description"] == (
        "Individual ordinal priorities and the final collective importance assigned "
        "to each criterion."
    )

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

    assert "### Overall priorities" in analysis["interpretation"]
    assert "### Expert perspectives" in analysis["interpretation"]
    assert "### Consensus adjustments" in analysis["interpretation"]
    assert "### Points worth reviewing" in analysis["interpretation"]
    assert (
        "**Criterion 1** and **Criterion 2** shared the greatest final collective "
        "importance"
    ) in analysis["interpretation"]
    assert "How to read the summary" not in analysis["interpretation"]
    assert "Σ|Δ|" not in analysis["interpretation"]
    assert "ε =" not in analysis["interpretation"]

    visualizations = {item["key"]: item for item in analysis["visualizations"]}
    assert visualizations["mcc-adjustment-map"]["type"] == "heatmap"
    assert visualizations["collective-criterion-importance"]["type"] == "bar"
    assert visualizations["collective-criterion-importance"]["title"] == (
        "Collective criterion importance"
    )
    assert visualizations["collective-criterion-importance"]["xAxis"]["label"] == (
        "Final collective weight (%)"
    )
    assert visualizations["collective-criterion-importance"]["data"]["categories"] == [
        "Criterion 1",
        "Criterion 2",
        "Criterion 3",
    ]
    assert visualizations["collective-criterion-importance"]["data"]["series"][0]["values"] == [
        41.67,
        41.67,
        16.67,
    ]
    assert visualizations["mcc-adjustment-map"]["title"] == (
        "Weight changes by expert and criterion"
    )
    assert visualizations["mcc-adjustment-effort-by-expert"]["title"] == (
        "Weight adjustment by expert"
    )
    assert visualizations["mcc-adjustment-effort-by-criterion"]["title"] == (
        "Weight adjustment by criterion"
    )
    assert visualizations["mcc-adjustment-effort-by-expert"]["xAxis"]["label"] == (
        "Total weight moved"
    )
    assert visualizations["mcc-adjustment-effort-by-criterion"]["xAxis"]["label"] == (
        "Total weight moved"
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
        "individual-preference-distribution",
    ]

    assert {
        item["criterionId"]: item["collectiveWeight"]
        for item in analysis["facts"]["criteria"]["items"]
    } == {
        "c1": 0.5,
        "c2": 1.0 / 3.0,
        "c3": 1.0 / 6.0,
    }

    assert [
        section["id"]
        for section
        in analysis[
            "sections"
        ]
    ] == [
        "criterion-preferences-importance",
    ]

    assert all(
        section["visualizations"]
        for section in analysis["sections"]
    )
    assert analysis["sections"][0]["title"] == (
        "Criterion preferences and collective weights"
    )

    assert "### Overall priorities" in analysis["interpretation"]
    assert "### Expert perspectives" in analysis["interpretation"]
    assert "### Consensus adjustments" not in analysis["interpretation"]
    assert "### Points worth reviewing" not in analysis["interpretation"]


def test_greece_interpretation_uses_executed_priorities_and_is_deterministic(
    greece_execution,
):
    facts = greece_execution["facts"]
    interpretation = greece_execution["interpretation"]
    criteria = {
        item["name"]: item for item in facts["criteria"]["items"]
    }
    leader = criteria["Local Socio-Economic Benefits"]
    mcc = facts["mcc"]

    assert leader["collectiveWeight"] == pytest.approx(0.22142857)
    assert leader["firstPlaceCount"] == 2
    assert leader["topThreeCount"] == 5
    assert "22.14%" in interpretation
    assert "All 5 experts placed it among their three highest priorities" in interpretation
    assert "only 2 ranked it first" in interpretation
    assert "from first to last" in interpretation
    assert "Expert E" in interpretation
    assert "Expert B" in interpretation
    assert mcc["largestEffortExperts"][0]["name"] == "Expert E"
    assert mcc["largestEffortCriteria"][0]["name"] == (
        "Site Accessibility and Infrastructure Security"
    )
    assert mcc["maxConsensusDeviation"] <= mcc["epsilon"] + 1e-6
    assert "do not show which expert was furthest" in interpretation
    assert "does not mean the experts changed their stated preferences" in interpretation
    assert build_interpretation(deepcopy(facts)) == interpretation


def test_contrasting_execution_adapts_to_narrow_rank_differences_and_tied_criteria(
    greece_execution,
    split_priorities_execution,
):
    facts = split_priorities_execution["facts"]
    interpretation = split_priorities_execution["interpretation"]
    greece_mcc = greece_execution["facts"]["mcc"]
    mcc = facts["mcc"]

    assert "The largest ranking differences were small" in interpretation
    assert "First-place choices were split" in interpretation
    assert "appeared at opposite ends" not in interpretation
    assert "**Criterion 1** and **Criterion 2**" in interpretation
    assert "each had 0.067 summed across experts" in interpretation
    assert mcc["totalAbsoluteAdjustment"] < greece_mcc["totalAbsoluteAdjustment"]
    assert mcc["maxConsensusDeviation"] <= mcc["epsilon"] + 1e-6


def test_adjustment_narrative_handles_no_adjustment_from_real_model_execution(
    same_priorities_execution,
):
    interpretation = same_priorities_execution["interpretation"]
    visualization = next(
        item
        for item in same_priorities_execution["visualizations"]
        if item["key"] == "mcc-adjustment-map"
    )

    assert "No numerical adjustment was needed" in interpretation
    assert "The calculation left the original expert weights unchanged." == visualization["insight"]
    assert "largest accumulated adjustment" not in interpretation


def test_adjustment_narrative_handles_tied_experts_and_incomplete_diagnostics(
    greece_execution,
    split_priorities_execution,
):
    tied_facts = deepcopy(split_priorities_execution["facts"])
    expert_efforts = tied_facts["mcc"]["effortByExpert"]
    expert_efforts[1]["effort"] = expert_efforts[0]["effort"]
    tied_facts["mcc"]["largestEffortExperts"] = [
        {"expertKey": item["expertKey"], "name": item["name"]}
        for item in expert_efforts
    ]
    tied_text = build_interpretation(tied_facts)

    assert "tied across the profiles of **Expert 1** and **Expert 2**" in tied_text
    assert "each had 0.133 summed across criteria" in tied_text

    incomplete = deepcopy(greece_execution["facts"])
    incomplete_mcc = incomplete["mcc"]
    incomplete_mcc["totalAbsoluteAdjustment"] = None
    incomplete_mcc["maxConsensusDeviation"] = None
    incomplete_mcc["epsilon"] = None
    incomplete_mcc["largestEffortExperts"] = []
    incomplete_mcc["largestEffortCriteria"] = []
    incomplete_text = build_interpretation(incomplete)

    assert "cannot determine whether an adjustment was needed" in incomplete_text
    assert "cannot be confirmed from this record" in incomplete_text
    assert "does not mean the calculation met its limit" not in incomplete_text
    assert "The calculation adjusted the original numerical weights" not in incomplete_text


def test_adjustment_narrative_does_not_claim_an_exceeded_bound_was_satisfied(
    greece_execution,
):
    facts = deepcopy(greece_execution["facts"])
    facts["mcc"]["maxConsensusDeviation"] = facts["mcc"]["epsilon"] + 0.01

    interpretation = build_interpretation(facts)

    assert "is above the configured limit" in interpretation
    assert "does not show that the calculation met its limit" in interpretation
