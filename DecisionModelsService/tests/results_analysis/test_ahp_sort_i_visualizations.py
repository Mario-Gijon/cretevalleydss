from copy import deepcopy

from models.ahp_sort_i.analysis.core import build_core_facts
from models.ahp_sort_i.analysis.evidence import extract_ahp_sort_i_evidence
from models.ahp_sort_i.analysis.sensitivity import build_sensitivity_facts
from models.ahp_sort_i.analysis.visualizations import (
    build_visualization_sections,
    build_visualizations,
)
from models.ahp_sort_i.examples import AHPSORT_I_REQUEST_EXAMPLES
from models.ahp_sort_i.executor import execute_ahp_sort_i
from schemas.model_requests import GenericModelExecutionRequest


def _limiting_request() -> dict:
    return deepcopy(AHPSORT_I_REQUEST_EXAMPLES["limiting_profiles"]["value"])


def _central_request() -> dict:
    request = deepcopy(AHPSORT_I_REQUEST_EXAMPLES["central_profiles_with_tie"]["value"])
    request["context"]["criteria"].append({"id": "safety", "name": "Safety"})
    request["modelParameters"]["weights"] = {"quality": 0.65, "safety": 0.35}
    payload = request["evaluations"][0]["payload"]
    payload["alternativeProfileComparisons"].extend(
        {**comparison, "criterionId": "safety"}
        for comparison in list(payload["alternativeProfileComparisons"])
    )
    payload["profileComparisons"].extend(
        {**comparison, "criterionId": "safety"}
        for comparison in list(payload["profileComparisons"])
    )
    return request


def _collective_request() -> dict:
    request = _limiting_request()
    second = deepcopy(request["evaluations"][0])
    second["expert"] = {"id": "expert-2", "name": "Expert Two"}
    for comparison in second["payload"]["alternativeProfileComparisons"]:
        comparison["alternativeToProfile"] = 1 / comparison["alternativeToProfile"]
    request["evaluations"].append(second)
    request["modelParameters"]["ahpSortGroup"] = {"tiePolicy": "pessimistic"}
    return request


def _evidence(request_data: dict):
    GenericModelExecutionRequest.model_validate(request_data)
    response = execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request_data))
    assert response["success"] is True
    return extract_ahp_sort_i_evidence(
        {
            "rounds": [
                {
                    "phase": 2,
                    "execution": {
                        "attemptId": "visualization-attempt",
                        "modelContext": {"apiModelKey": "ahp_sort_i"},
                        "input": request_data,
                        "result": {"standardResult": response["data"]},
                    },
                }
            ]
        }
    )


def _visualizations(evidence):
    facts = build_core_facts(evidence)
    facts["sensitivity"] = build_sensitivity_facts(evidence)
    return facts, build_visualizations(facts)


def test_limiting_original_and_sections_use_ordered_categories_and_contract():
    evidence = _evidence(_limiting_request())
    facts, visualizations = _visualizations(evidence)
    original = next(
        item for item in visualizations if item["key"] == "ahp-sort-i-original-classifications"
    )
    expert = original["data"]["series"][0]
    point = expert["points"][0]

    assert [item["label"] for item in original["xAxis"]["categories"]] == [
        item["label"] for item in sorted(evidence.categories, key=lambda category: category["order"])
    ]
    assert point["details"]["Classification"] in {
        category["label"] for category in evidence.categories
    }
    weight_sensitivity = next(
        item for item in visualizations
        if item["key"] == "ahp-sort-i-criterion-weight-sensitivity-quality"
    )
    assert weight_sensitivity["data"]["originalWeightBaselineComparison"][
        "individualAssignmentsMatch"
    ] is True
    alternative_series = next(
        series for series in weight_sensitivity["data"]["series"]
        if series["role"] == "alternative"
    )
    configured_sample = next(
        value
        for value in alternative_series["values"]
        if value["isConfiguredWeight"]
    )
    assert configured_sample["details"][
        "Original-weight result matches validated baseline"
    ] is True
    assert "Alternative priority · this expert and alternative matrix" in point["details"]
    assert "Profile priority ·" in " ".join(point["details"])
    assert alternative_series["resultType"] == "individual"
    assert alternative_series["style"]["stepped"] == "after"
    assert not any(series["role"] == "boundary" for series in weight_sensitivity["data"]["series"])
    category_index = next(
        index for index, category in enumerate(weight_sensitivity["yAxis"]["categories"])
        if category["label"] == configured_sample["details"]["Assigned category"]
    )
    offset = weight_sensitivity["data"]["categoryDisplayOffsets"][alternative_series["alternativeId"]]
    assert configured_sample["y"] == category_index + offset
    assert abs(offset) <= 0.12
    assert weight_sensitivity["presentation"]["alternativeSelector"] == {"recommendedCount": 3}
    assert "resultSelector" not in weight_sensitivity["presentation"]
    assert not any("priority" in key.lower() for key in configured_sample["details"])
    assert len([
        item for item in visualizations
        if item["type"] == "line" and item["scope"]["id"] == "quality"
    ]) == 1

    sections = build_visualization_sections(facts)
    assert [section["id"] for section in sections] == [
        "ahp-sort-i-original-classifications",
        "ahp-sort-i-criterion-weight-sensitivity",
    ]
    assert sections[0]["presentation"]["comparisonKey"] == evidence.comparison_key
    assert sections[1]["presentation"]["scopeSelector"] == "criterion"
    assert all(
        visualization["scope"]["dimension"] == "criterion"
        for visualization in sections[1]["visualizations"]
    )


def test_central_sensitivity_keeps_central_categories_and_tie_evidence():
    evidence = _evidence(_central_request())
    _facts, visualizations = _visualizations(evidence)
    original = next(
        item for item in visualizations if item["key"] == "ahp-sort-i-original-classifications"
    )
    point = original["data"]["series"][0]["points"][0]
    sensitivity = next(
        item for item in visualizations
        if item["key"] == "ahp-sort-i-criterion-weight-sensitivity-quality"
    )
    alternative_series = next(
        series for series in sensitivity["data"]["series"] if series["role"] == "alternative"
    )
    configured = next(
        value
        for value in alternative_series["values"]
        if value["isConfiguredWeight"]
    )

    assert evidence.profile_mode == "central"
    assert point["details"]["Central profile tie detected"] is True
    assert point["details"]["Distance to selected central profile"] is not None
    assert configured["details"]["Assigned category"] in {
        category["label"] for category in evidence.categories
    }
    assert "Selected central profile" in point["details"]
    assert sensitivity["yAxis"]["categories"]
    assert all(series["style"]["stepped"] == "after" for series in sensitivity["data"]["series"])


def test_collective_visualizations_separate_experts_and_plurality_without_priority():
    evidence = _evidence(_collective_request())
    _facts, visualizations = _visualizations(evidence)
    original = next(
        item for item in visualizations if item["key"] == "ahp-sort-i-original-classifications"
    )
    collective = next(series for series in original["data"]["series"] if series["role"] == "collective")
    individual = [series for series in original["data"]["series"] if series["role"] == "individual"]
    collective_details = collective["points"][0]["details"]
    sensitivity = next(
        item for item in visualizations
        if item["key"] == "ahp-sort-i-criterion-weight-sensitivity-quality"
    )
    sensitivity_collective = next(
        series for series in sensitivity["data"]["series"]
        if series["resultType"] == "collective"
    )

    assert len(individual) == 2
    assert {series["label"] for series in individual} == {
        "Individual · Expert One",
        "Individual · Expert Two",
    }
    assert collective_details["Result type"] == "Collective plurality vote"
    assert "Votes · Low" in collective_details
    assert not any("priority" in key.lower() for key in collective_details)
    assert len([
        item for item in visualizations
        if item["type"] == "line" and item["scope"]["id"] == "quality"
    ]) == 1
    assert sensitivity["presentation"]["resultSelector"]["defaultValue"] == "individual"
    assert sensitivity["presentation"]["resultSelector"]["options"] == [
        {"value": "individual", "label": "Individual"},
        {"value": "collective", "label": "Collective"},
    ]
    assert sensitivity_collective["style"]["stepped"] == "after"
    assert any("Votes ·" in key for key in sensitivity_collective["values"][0]["details"])
    assert any("Individual vote ·" in key for key in sensitivity_collective["values"][0]["details"])
    assert not any("priority" in key.lower() for key in sensitivity_collective["values"][0]["details"])
    assert all(series["resultType"] in {"individual", "collective"} for series in sensitivity["data"]["series"])


def test_unavailable_weight_samples_are_gaps_and_report_the_reason():
    request = _limiting_request()
    request["modelParameters"]["weights"] = {"quality": 1.0, "safety": 0.0}
    evidence = _evidence(request)
    _facts, visualizations = _visualizations(evidence)
    sensitivity = next(
        item for item in visualizations
        if item["key"] == "ahp-sort-i-criterion-weight-sensitivity-quality"
    )
    series = next(series for series in sensitivity["data"]["series"] if series["role"] == "alternative")
    unavailable = next(value for value in series["values"] if value["x"] == 0.95)
    baseline = next(value for value in series["values"] if value["isConfiguredWeight"])

    assert unavailable["y"] is None
    assert unavailable["details"]["Unavailable reason"] == (
        "proportional_redistribution_impossible_zero_complement"
    )
    assert any(
        sample["weight"] == 0.95
        and sample["reason"] == "proportional_redistribution_impossible_zero_complement"
        for sample in sensitivity["data"]["unavailableSamples"]
    )
    assert baseline["y"] is not None
    assert all(item["resultType"] == "individual" for item in sensitivity["data"]["series"])
    assert sensitivity["presentation"]["alternativeSelector"]["recommendedCount"] == 3
    assert "expertSelector" not in sensitivity["presentation"]
    assert "resultSelector" not in sensitivity["presentation"]
