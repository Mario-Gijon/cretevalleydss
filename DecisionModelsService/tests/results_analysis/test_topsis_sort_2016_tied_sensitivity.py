from copy import deepcopy

import pytest
from models.topsis_sort_2016.analysis.evidence import TopsisSort2016Evidence
from models.topsis_sort_2016.analysis.interpretation import (
    _sensitivity_evidence,
    build_interpretation,
)
from models.topsis_sort_2016.analysis.sensitivity import build_sensitivity_facts
from models.topsis_sort_2016.analysis.visualizations import build_visualizations
from models.topsis_sort_2016.run import (
    ProfileBoundaryTieError,
    _calculate_topsis_sort_2016_numeric,
    run_topsis_sort_2016,
)
from models.topsis_sort_2016.tehran_2016 import (
    TEHRAN_ALTERNATIVES,
    TEHRAN_CATEGORIES,
    TEHRAN_CRITERIA,
    TEHRAN_PROFILES,
)


def _tehran_evidence():
    criteria = [
        {
            "criterionId": item["criterion_id"],
            "name": item["criterion_id"],
            "direction": item["direction"],
            "weight": item["weight"],
            "minimum": None,
            "maximum": None,
        }
        for item in TEHRAN_CRITERIA
    ]
    alternatives = [
        {
            "alternativeId": item["alternative_id"],
            "name": item["alternative_id"].replace("district-", "District "),
            "valuesByCriterionId": deepcopy(item["values_by_criterion_id"]),
        }
        for item in TEHRAN_ALTERNATIVES
    ]
    baseline_result = run_topsis_sort_2016(
        alternatives=TEHRAN_ALTERNATIVES,
        criteria=TEHRAN_CRITERIA,
        profiles=TEHRAN_PROFILES,
        categories=TEHRAN_CATEGORIES,
    )
    assignments = {
        item["alternative_id"]: item["category_id"]
        for item in baseline_result["assignments"]
    }
    categories_by_id = {item["category_id"]: item for item in TEHRAN_CATEGORIES}
    baseline_facts = {
        "alternatives": [
            {
                "alternativeId": item["alternative_id"],
                "name": item["alternative_id"].replace("district-", "District "),
                "categoryId": assignments[item["alternative_id"]],
                "categoryLabel": categories_by_id[assignments[item["alternative_id"]]]["label"],
                "closeness": baseline_result["diagnostics"][
                    "closeness_by_alternative_id"
                ][item["alternative_id"]],
            }
            for item in TEHRAN_ALTERNATIVES
        ]
    }
    evidence = TopsisSort2016Evidence(
        source_phase=0,
        executed_rounds=1,
        execution_id="tehran-baseline",
        comparison_key="tehran-fixture",
        frozen_input={},
        alternatives=alternatives,
        criteria=criteria,
        collective_matrix=[],
        profiles=deepcopy(TEHRAN_PROFILES),
        categories=deepcopy(TEHRAN_CATEGORIES),
        executed_assignments=assignments,
        baseline_result=baseline_result,
    )
    return evidence, baseline_facts


def test_tehran_g1_one_keeps_numeric_curves_and_marks_only_district_21_undetermined():
    evidence, baseline_facts = _tehran_evidence()
    sensitivity = build_sensitivity_facts(evidence, baseline_facts)
    g1 = next(item for item in sensitivity["items"] if item["criterionId"] == "g1")
    endpoint = next(point for point in g1["points"] if point["variedWeight"] == 1.0)

    assert endpoint["criterionWeights"] == [
        {"criterionId": criterion["criterionId"], "weight": 1.0 if criterion["criterionId"] == "g1" else 0.0}
        for criterion in evidence.criteria
    ]
    assert endpoint["numericAvailable"] is True
    assert endpoint["profilesAvailable"] is True
    assert endpoint["classificationAvailable"] is False
    assert endpoint["available"] is False
    assert len(endpoint["closenessByAlternativeId"]) == 22
    assert len(endpoint["closenessByProfileId"]) == 4
    assert endpoint["closenessByAlternativeId"]["district-21"] == endpoint[
        "closenessByProfileId"]["p1"]
    assert endpoint["classificationStatusByAlternativeId"]["district-21"] == {
        "status": "undetermined_on_boundary",
        "boundaryProfileIds": ["p1"],
    }
    assert endpoint["reason"] == "alternative_equals_boundary"
    assert g1["summary"]["indeterminateSampleCount"] == 1
    assert g1["summary"]["allValidSamplesRetainBaselineCategory"] is False
    assert all(
        endpoint["classificationStatusByAlternativeId"][f"district-{number:02d}"]["status"]
        == "assigned"
        for number in range(1, 23)
        if number != 21
    )
    assert "district-21" not in {item["alternativeId"] for item in endpoint["assignments"]}
    assert {item["alternativeId"] for item in endpoint["assignments"]} == {
        f"district-{number:02d}" for number in range(1, 23) if number != 21
    }
    assert g1["numericAvailable"] is True

    direct_numeric = _calculate_topsis_sort_2016_numeric(
        alternatives=TEHRAN_ALTERNATIVES,
        criteria=[
            {**item, "weight": 1.0 if item["criterion_id"] == "g1" else 0.0}
            for item in TEHRAN_CRITERIA
        ],
        profiles=TEHRAN_PROFILES,
        categories=TEHRAN_CATEGORIES,
    )
    assert endpoint["closenessByAlternativeId"] == direct_numeric["diagnostics"][
        "closeness_by_alternative_id"
    ]
    assert endpoint["closenessByProfileId"] == direct_numeric["diagnostics"][
        "closeness_by_profile_id"
    ]

    for alternative_id in ("district-02", "district-09", "district-13"):
        assert endpoint["closenessByAlternativeId"][alternative_id] is not None
    assert all(value is not None for value in endpoint["closenessByProfileId"].values())

    diagnostics = evidence.baseline_result["diagnostics"]
    baseline_categories = {item["category_id"]: item for item in evidence.categories}
    facts = {
        "status": "available",
        "comparisonKey": evidence.comparison_key,
        "categories": [
            {
                "categoryId": item["category_id"],
                "label": item["label"],
                "order": item["order"],
            }
            for item in evidence.categories
        ],
        "profiles": [
            {
                "profileId": profile["profile_id"],
                "label": profile["profile_id"],
                "closeness": diagnostics["closeness_by_profile_id"][profile["profile_id"]],
            }
            for profile in evidence.profiles
        ],
        "alternatives": [
            {
                **alternative,
                "categoryId": baseline_facts["alternatives"][index]["categoryId"],
                "categoryLabel": baseline_categories[
                    baseline_facts["alternatives"][index]["categoryId"]
                ]["label"],
                "closeness": diagnostics["closeness_by_alternative_id"][alternative["alternativeId"]],
                "nearestBoundary": {"label": "boundary", "distance": 0.0},
            }
            for index, alternative in enumerate(evidence.alternatives)
        ],
        "sensitivity": sensitivity,
    }
    descriptor = next(
        item for item in build_visualizations(facts)
        if item["key"] == "topsis-sort-criterion-weight-sensitivity-g1"
    )
    alternative_series = next(
        item for item in descriptor["data"]["series"]
        if item["key"] == "district-21"
    )
    tie_plot_point = next(point for point in alternative_series["values"] if point["x"] == 1.0)
    assert tie_plot_point["y"] == endpoint["closenessByAlternativeId"]["district-21"]
    assert tie_plot_point["category"] is None
    assert tie_plot_point["details"]["Category status"] == "Undetermined — exactly on a boundary"
    assert len(tie_plot_point["details"]["Category status"]) > 0
    for series in descriptor["data"]["series"]:
        point_at_one = next(point for point in series["values"] if point["x"] == 1.0)
        assert point_at_one["y"] is not None

    varied_criteria = [
        {**item, "weight": 1.0 if item["criterion_id"] == "g1" else 0.0}
        for item in TEHRAN_CRITERIA
    ]
    with pytest.raises(ProfileBoundaryTieError, match="district-21"):
        run_topsis_sort_2016(
            alternatives=TEHRAN_ALTERNATIVES,
            criteria=varied_criteria,
            profiles=TEHRAN_PROFILES,
            categories=TEHRAN_CATEGORIES,
        )


def test_interpretation_does_not_treat_a_partial_boundary_scenario_as_a_change():
    evidence, baseline_facts = _tehran_evidence()
    sensitivity = build_sensitivity_facts(evidence, baseline_facts)
    facts = {
        "criteria": evidence.criteria,
        "categories": [
            {
                "categoryId": item["category_id"],
                "label": item["label"],
                "order": item["order"],
            }
            for item in evidence.categories
        ],
        "alternatives": baseline_facts["alternatives"],
        "sensitivity": sensitivity,
    }

    candidates, _, _, _, indeterminate_count = _sensitivity_evidence(facts)
    assert all(candidate["variedWeight"] != 1.0 for candidate in candidates)
    assert indeterminate_count == 1
    interpretation = build_interpretation({"status": "available", **facts})
    assert (
        "Some tested weights could not produce a clear classification and were "
        "excluded from these conclusions."
    ) in interpretation


def test_tehran_interpretation_names_closeness_and_uses_compact_sensitivity_language():
    evidence, baseline_facts = _tehran_evidence()
    sensitivity = build_sensitivity_facts(evidence, baseline_facts)
    facts = {
        "status": "available",
        "criteria": evidence.criteria,
        "categories": [
            {
                "categoryId": item["category_id"],
                "label": item["label"],
                "order": item["order"],
            }
            for item in evidence.categories
        ],
        "alternatives": baseline_facts["alternatives"],
        "sensitivity": sensitivity,
    }

    interpretation = build_interpretation(facts)
    sensitivity_text = interpretation.split(
        "### Criterion weight sensitivity\n\n", 1
    )[1]

    assert "**District 04** and **District 22** were both classified as" in interpretation
    assert "**District 22** has a higher relative closeness" in interpretation
    assert "(0.84 compared with 0.71)" in interpretation
    assert "Each scenario changes the importance" in sensitivity_text
    assert "When **g1** increases from 20% to 25%" in sensitivity_text
    assert "Meanwhile, **District 13** moves from **Suitable** to **High suitable**" in sensitivity_text
    assert "When **g5** increases from 20% to 25%" in sensitivity_text
    assert "When **g4** increases from 20% to 25%" in sensitivity_text
    assert "District 10** changes category in two scenarios" in sensitivity_text
    assert "Some tested weights could not produce a clear classification" in sensitivity_text
    assert "in the tested scenario" not in sensitivity_text
    assert sensitivity_text.count("exact switching points were not calculated") == 1

    for item in sensitivity["items"]:
        for point in item["points"]:
            if point.get("classificationAvailable") is False:
                point["numericAvailable"] = False
    without_numeric_indeterminate = build_interpretation({"status": "available", **facts})
    assert "Some tested weights could not produce a clear classification" not in (
        without_numeric_indeterminate
    )
