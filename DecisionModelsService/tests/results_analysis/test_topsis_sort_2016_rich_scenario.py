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
    summary = MATH_VALIDATOR.validate_fixture(
        FIXTURE_PATH,
        include_interpretation=True,
    )

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
    interpretation = summary["interpretation"]
    assert "### Result interpretation" in interpretation
    assert "### Criterion weight sensitivity" in interpretation
    assert "Purchase cost" in interpretation and "from 20% to 25%" in interpretation
    assert "Delivery time" in interpretation and "from 12.5% to 20%" in interpretation
    assert "Sustainability" in interpretation and "from 14.5% to 10%" in interpretation
    assert (
        "Evergreen Circular Supply** changes category in three scenarios"
        in interpretation
    )
    assert "Each scenario changes the importance" in interpretation
    assert interpretation.count("Each scenario changes the importance") == 1
    assert "its classification responds across multiple criteria" in interpretation
    assert "in the tested scenario" not in interpretation
    assert "After-sales support" not in interpretation
    assert "the exact switching points were not calculated" in interpretation
    assert len(interpretation.split()) <= 160
    projection = summary["projection"]
    assert len(projection["expert_points"]) == 4
    assert len(set(map(tuple, projection["expert_points"]))) == 4
    assert projection["identical_evaluation_groups"] == []
    assert projection["collective_identical_expert_ids"] == []
