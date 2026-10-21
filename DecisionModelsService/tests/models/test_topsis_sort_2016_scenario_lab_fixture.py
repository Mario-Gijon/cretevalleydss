import json
from pathlib import Path

from models.topsis_sort_2016.run import run_topsis_sort_2016


def test_scenario_lab_fixture_has_reproducible_strictly_delimited_assignments():
    fixture_path = Path(__file__).parents[3] / "Automation/issue_scenario_lab/data/topsis_sort_2016.json"
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    criteria_by_key = {item["key"]: item for item in fixture["criteria"]}
    criteria = [
        {
            "criterion_id": key,
            "direction": criteria_by_key[key]["type"],
            "weight": fixture["criteriaWeights"][key],
            "minimum": 0,
            "maximum": 10,
        }
        for key in ("quality", "cost")
    ]
    alternatives = [
        {
            "alternative_id": item["key"],
            "values_by_criterion_id": fixture["evaluations"][item["key"]],
        }
        for item in fixture["alternatives"]
    ]
    profiles = [
        {
            "profile_id": profile["profileId"],
            "category_id": profile["categoryId"],
            "values_by_criterion_id": profile["valuesByCriterionId"],
        }
        for profile in fixture["boundaryProfiles"]["profiles"]
    ]

    result = run_topsis_sort_2016(
        alternatives=alternatives,
        criteria=criteria,
        profiles=profiles,
        categories=[
            {"category_id": item["categoryId"], "label": item["label"], "order": item["order"]}
            for item in fixture["orderedCategories"]
        ],
    )

    assert {item["alternative_id"]: item["category_id"] for item in result["assignments"]} == fixture["expectedAssignments"]
    closeness = result["diagnostics"]["closeness_by_profile_id"]
    assert closeness["medium-boundary"] < closeness["high-boundary"]
    alternative_closeness = result["diagnostics"]["closeness_by_alternative_id"]
    assert all(value not in closeness.values() for value in alternative_closeness.values())
