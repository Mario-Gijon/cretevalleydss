from copy import deepcopy
import json

from models.ahp_sort_i.analysis import analyze_issue
from models.ahp_sort_i.examples import AHPSORT_I_REQUEST_EXAMPLES
from models.ahp_sort_i.executor import execute_ahp_sort_i
from schemas.model_requests import GenericModelExecutionRequest
from services.results_analysis.contracts import normalize_analysis_result
from services.results_analysis.model_analysis import load_model_analysis_handlers


def _limiting_request() -> dict:
    return deepcopy(AHPSORT_I_REQUEST_EXAMPLES["limiting_profiles"]["value"])


def _central_request(*, add_second_criterion: bool = False) -> dict:
    request = deepcopy(AHPSORT_I_REQUEST_EXAMPLES["central_profiles_with_tie"]["value"])
    if add_second_criterion:
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


def _profile_order_crossing_request() -> dict:
    request = _limiting_request()
    request["context"]["criteria"] = [
        {"id": "criterion-a", "name": "Criterion A"},
        {"id": "criterion-b", "name": "Criterion B"},
    ]
    request["context"]["alternatives"] = [{"id": "alternative", "name": "Alternative"}]
    request["modelParameters"]["weights"] = {"criterion-a": 0.8, "criterion-b": 0.2}
    request["modelParameters"]["orderedCategories"] = [
        {"categoryId": "low", "label": "Low", "order": 0},
        {"categoryId": "middle", "label": "Middle", "order": 1},
        {"categoryId": "high", "label": "High", "order": 2},
    ]
    request["modelParameters"]["ahpSortProfiles"]["profiles"] = [
        {
            "profileId": "profile-low-middle",
            "lowerCategoryId": "low",
            "upperCategoryId": "middle",
        },
        {
            "profileId": "profile-middle-high",
            "lowerCategoryId": "middle",
            "upperCategoryId": "high",
        },
    ]
    request["evaluations"][0]["payload"] = {
        "alternativeProfileComparisons": [
            {
                "alternativeId": "alternative",
                "criterionId": "criterion-a",
                "profileId": "profile-low-middle",
                "alternativeToProfile": 1,
            },
            {
                "alternativeId": "alternative",
                "criterionId": "criterion-a",
                "profileId": "profile-middle-high",
                "alternativeToProfile": 0.5,
            },
            {
                "alternativeId": "alternative",
                "criterionId": "criterion-b",
                "profileId": "profile-low-middle",
                "alternativeToProfile": 0.5,
            },
            {
                "alternativeId": "alternative",
                "criterionId": "criterion-b",
                "profileId": "profile-middle-high",
                "alternativeToProfile": 1,
            },
        ],
        "profileComparisons": [
            {
                "criterionId": "criterion-a",
                "firstProfileId": "profile-low-middle",
                "secondProfileId": "profile-middle-high",
                "firstToSecond": 0.5,
            },
            {
                "criterionId": "criterion-b",
                "firstProfileId": "profile-low-middle",
                "secondProfileId": "profile-middle-high",
                "firstToSecond": 2,
            },
        ],
    }
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


def _context(request: dict) -> dict:
    parsed = GenericModelExecutionRequest.model_validate(request)
    response = execute_ahp_sort_i(parsed)
    assert response["success"] is True
    return {
        "rounds": [
            {
                "phase": 2,
                "execution": {
                    "attemptId": "analysis-attempt",
                    "modelContext": {"apiModelKey": "ahp_sort_i"},
                    "input": request,
                    "result": {"standardResult": response["data"]},
                },
            }
        ]
    }


def test_limiting_and_central_interpretations_explain_mode_and_matrix_scope():
    limiting = analyze_issue(_context(_limiting_request()))["interpretation"]
    central = analyze_issue(_context(_central_request(add_second_criterion=True)))["interpretation"]

    assert "limiting profiles" in limiting
    assert "profile priorities in the same matrix" in limiting
    assert "not directly comparable" in limiting
    assert "central profiles" in central
    assert "Central-profile ties" in central
    assert "optimistic policy" in central


def test_sensitivity_interpretation_uses_observed_changes_and_reports_invalid_samples():
    analysis = analyze_issue(_context(_profile_order_crossing_request()))
    interpretation = analysis["interpretation"]

    assert "Criterion weight sensitivity" in interpretation
    assert "redistributing the remaining weight proportionally" in interpretation
    assert "category changes were observed" in interpretation
    assert "Low** → **Middle" in interpretation
    assert "20 percentage points away" in interpretation
    assert "% percentage points away" not in interpretation
    assert "another category" not in interpretation
    assert "not an exact switching threshold" in interpretation
    assert "invalid ordering of limiting profiles" in interpretation
    assert "matches the validated original execution" in interpretation
    assert "collective plurality votes" not in interpretation


def test_collective_interpretation_separates_experts_and_plurality_without_score():
    interpretation = analyze_issue(_context(_collective_request()))["interpretation"]

    assert "Individual classifications for" in interpretation
    assert "Expert Two" in interpretation
    assert "collective classifications" in interpretation
    assert "plurality" in interpretation
    assert "No collective numeric priority is calculated" in interpretation
    assert "collective plurality votes" in interpretation
    assert "Plurality ties were resolved" in interpretation
    assert "pessimistic policy" in interpretation
    assert "collective priority:" not in interpretation


def test_issue_analysis_contract_is_discovered_and_feeds_existing_visualization_sections():
    context = _context(_limiting_request())
    handler = load_model_analysis_handlers("ahp_sort_i")["analyze_issue"]
    analysis = handler(context)
    normalized = normalize_analysis_result(analysis)
    json.dumps(normalized, allow_nan=False)

    assert set(normalized) == {"facts", "interpretation", "visualizations", "sections"}
    assert normalized["facts"]["sensitivity"]["availability"]["available"] is True
    assert len(normalized["visualizations"]) >= 1
    assert [section["title"] for section in normalized["sections"]] == [
        "Criterion weight sensitivity",
    ]
    assert normalized["sections"][0]["presentation"]["scopeSelector"] == "criterion"


def test_missing_invalid_and_single_criterion_evidence_are_explicit():
    missing = analyze_issue({})
    assert missing["facts"]["status"] == "unavailable"
    assert "Model Analysis unavailable" in missing["interpretation"]
    assert missing["visualizations"] == []
    assert missing["sections"] == []

    invalid_context = _context(_limiting_request())
    invalid_context["rounds"][0]["execution"]["result"]["standardResult"]["assignments"][0]["categoryId"] = "not-a-category"
    invalid = analyze_issue(invalid_context)
    assert invalid["facts"]["status"] == "invalid_execution"
    assert "No model-specific conclusions were generated" in invalid["interpretation"]
    assert invalid["visualizations"] == []

    one_criterion = analyze_issue(_context(_central_request()))
    assert one_criterion["facts"]["sensitivity"]["availability"] == {
        "available": False,
        "reason": "single_criterion",
    }
    assert "only one criterion" in one_criterion["interpretation"]
