from copy import deepcopy

import pytest

from models.ahp_sort_i.analysis.evidence import (
    AHPSortIEvidence,
    AnalysisEvidenceUnavailable,
    InvalidOriginalExecution,
    extract_ahp_sort_i_evidence,
)
from models.ahp_sort_i.examples import AHPSORT_I_REQUEST_EXAMPLES
from models.ahp_sort_i.executor import execute_ahp_sort_i
from schemas.model_requests import GenericModelExecutionRequest


def _analysis_context(
    example_name: str = "limiting_profiles", *, collective: bool = False
) -> dict:
    frozen_input = deepcopy(AHPSORT_I_REQUEST_EXAMPLES[example_name]["value"])
    if collective:
        second_evaluation = deepcopy(frozen_input["evaluations"][0])
        second_evaluation["expert"] = {
            "id": "expert-2",
            "name": "Expert Two",
        }
        frozen_input["evaluations"].append(second_evaluation)
        frozen_input["modelParameters"]["ahpSortGroup"] = {
            "tiePolicy": "pessimistic"
        }

    request = GenericModelExecutionRequest.model_validate(frozen_input)
    response = execute_ahp_sort_i(request)
    assert response["success"] is True
    return {
        "rounds": [
            {
                "phase": 3,
                "execution": {
                    "attemptId": f"attempt-{example_name}-{collective}",
                    "modelContext": {"apiModelKey": "ahp_sort_i"},
                    "input": frozen_input,
                    "result": {"standardResult": response["data"]},
                },
            }
        ]
    }


@pytest.mark.parametrize(
    ("example_name", "collective"),
    [
        ("limiting_profiles", False),
        ("central_profiles_with_tie", False),
        ("limiting_profiles", True),
        ("central_profiles_with_tie", True),
    ],
)
def test_extracts_and_reproduces_individual_and_collective_evidence(
    example_name: str, collective: bool
) -> None:
    context = _analysis_context(example_name, collective=collective)

    evidence = extract_ahp_sort_i_evidence(context)

    assert isinstance(evidence, AHPSortIEvidence)
    assert evidence.source_phase == 3
    assert evidence.executed_rounds == 1
    assert evidence.profile_mode == (
        "central" if example_name == "central_profiles_with_tie" else "limiting"
    )
    assert len(evidence.experts) == (2 if collective else 1)
    assert evidence.criteria[0]["weight"] == evidence.criterion_weights_by_id[
        evidence.criteria[0]["criterionId"]
    ]
    assert evidence.alternatives[0]["alternativeId"]
    assert len(evidence.categories) == (3 if example_name == "limiting_profiles" else 2)
    assert len(evidence.profiles) == len(evidence.categories) - (
        0 if example_name == "central_profiles_with_tie" else 1
    )
    assert evidence.experts[0]["alternativeProfileComparisons"]
    assert evidence.experts[0]["profileComparisons"]
    assert evidence.baseline_result == context["rounds"][0]["execution"]["result"][
        "standardResult"
    ]
    assert evidence.executed_assignments == {
        item["alternativeId"]: item["categoryId"]
        for item in evidence.baseline_result["assignments"]
    }
    if collective:
        assert evidence.group_tie_policy == "pessimistic"
        assert len(evidence.baseline_result["diagnostics"]["individualResultsByExpertId"]) == 2
    else:
        assert evidence.group_tie_policy is None


def test_legacy_result_without_numeric_metrics_still_builds_alternative_visualizations() -> None:
    context = _analysis_context("limiting_profiles", collective=True)
    stored = context["rounds"][0]["execution"]["result"]["standardResult"]
    del stored["numericMetrics"]

    from models.ahp_sort_i.analysis import analyze_issue

    analysis = analyze_issue(context)

    assert analysis["facts"]["status"] == "available"
    assert [section["title"] for section in analysis["sections"]] == [
        "Criterion weight sensitivity",
    ]
    assert any(
        descriptor["type"] == "line"
        for descriptor in analysis["visualizations"]
    )


def test_uses_the_latest_execution_and_effective_normalized_weights() -> None:
    context = _analysis_context()
    context["rounds"][0]["phase"] = 1
    latest = _analysis_context("limiting_profiles")
    latest["rounds"][0]["phase"] = 4
    latest_execution = latest["rounds"][0]["execution"]
    latest_execution["input"]["modelParameters"]["weights"] = {
        "quality": 0.65,
        "safety": 0.35000001,
    }
    request = GenericModelExecutionRequest.model_validate(latest_execution["input"])
    response = execute_ahp_sort_i(request)
    latest_execution["result"]["standardResult"] = response["data"]
    context["rounds"].extend(latest["rounds"])

    evidence = extract_ahp_sort_i_evidence(context)

    assert evidence.source_phase == 4
    assert evidence.executed_rounds == 2
    assert sum(evidence.criterion_weights_by_id.values()) == pytest.approx(1.0)
    assert evidence.criterion_weights_by_id == pytest.approx(
        {"quality": 0.65 / 1.00000001, "safety": 0.35000001 / 1.00000001}
    )


def test_missing_execution_or_frozen_input_is_reported_as_unavailable() -> None:
    with pytest.raises(AnalysisEvidenceUnavailable, match="No completed execution"):
        extract_ahp_sort_i_evidence({"rounds": []})

    context = _analysis_context()
    del context["rounds"][0]["execution"]["input"]
    with pytest.raises(AnalysisEvidenceUnavailable, match="frozen execution request"):
        extract_ahp_sort_i_evidence(context)


def test_incomplete_frozen_comparisons_are_reported_as_invalid() -> None:
    context = _analysis_context()
    context["rounds"][0]["execution"]["input"]["evaluations"][0]["payload"][
        "profileComparisons"
    ] = []

    with pytest.raises(InvalidOriginalExecution, match="could not be reproduced"):
        extract_ahp_sort_i_evidence(context)


def test_missing_stored_result_is_reported_as_invalid() -> None:
    context = _analysis_context()
    del context["rounds"][0]["execution"]["result"]["standardResult"]

    with pytest.raises(InvalidOriginalExecution, match="sorting result is missing"):
        extract_ahp_sort_i_evidence(context)


@pytest.mark.parametrize("corruption", ["assignment", "numeric", "incomplete_numeric"])
def test_inconsistent_or_incomplete_stored_result_is_rejected(corruption: str) -> None:
    context = _analysis_context()
    stored = context["rounds"][0]["execution"]["result"]["standardResult"]
    if corruption == "assignment":
        stored["assignments"][0]["categoryId"] = "unknown-category"
    elif corruption == "numeric":
        alternative = next(iter(stored["diagnostics"]["resultsByAlternativeId"].values()))
        alternative["globalPriority"] += 0.01
    else:
        alternative = next(iter(stored["diagnostics"]["resultsByAlternativeId"].values()))
        del alternative["globalPriority"]

    with pytest.raises(InvalidOriginalExecution, match="Stored"):
        extract_ahp_sort_i_evidence(context)
