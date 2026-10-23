from __future__ import annotations

import importlib.util
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_PATH = PROJECT_ROOT / "Automation/issue_scenario_lab/data/topsis_sort_2016_rich.json"
HELPER_PATH = PROJECT_ROOT / "Automation/issue_scenario_lab/src/issue_scenario_lab/scenarios/topsis_sort_2016_rich_math.py"
SPEC = importlib.util.spec_from_file_location("topsis_sort_2016_rich_math", HELPER_PATH)
assert SPEC is not None and SPEC.loader is not None
MATH_VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MATH_VALIDATOR)


def test_rich_scenario_reproduces_mcc_sorting_analysis_sensitivity_and_projection():
    summary = MATH_VALIDATOR.validate_fixture(FIXTURE_PATH)

    assert summary["mccWeightsByCriterion"] == {
        "quality": 0.25,
        "purchase_cost": 0.2,
        "delivery_reliability": 0.175,
        "delivery_time": 0.125,
        "sustainability": 0.145,
        "after_sales_support": 0.105,
    }
    assert summary["categoryCounts"] == {"low": 1, "medium": 8, "high": 1}
    assert set(summary["sensitivityChangedCriteria"]) >= {"quality", "purchase_cost"}
    assert summary["analysisSectionIds"] == [
        "topsis-sort-closeness-category-boundaries",
        "topsis-sort-criterion-weight-sensitivity",
    ]
    projection = summary["projection"]
    assert len(projection["expert_points"]) == 4
    assert len(set(map(tuple, projection["expert_points"]))) == 4
    assert projection["identical_evaluation_groups"] == []
    assert projection["collective_identical_expert_ids"] == []
