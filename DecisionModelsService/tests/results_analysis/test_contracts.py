from copy import deepcopy

import pytest

from services.results_analysis.contracts import normalize_analysis_result


def test_normalize_analysis_result_accepts_optional_sections_and_detaches():
    facts = {"nested": {"value": 1}}
    visualizations = [{"kind": "future", "data": {"points": [1, 2]}}]

    assert normalize_analysis_result(None) is None
    assert normalize_analysis_result({}) == {}
    assert normalize_analysis_result({"interpretation": "## Result"}) == {
        "interpretation": "## Result"
    }

    normalized_facts = normalize_analysis_result({"facts": facts})
    normalized_visualizations = normalize_analysis_result({"visualizations": visualizations})
    combined = normalize_analysis_result(
        {
            "facts": facts,
            "interpretation": "## Result",
            "visualizations": visualizations,
        }
    )
    facts["nested"]["value"] = 2
    visualizations[0]["data"]["points"].append(3)

    assert normalized_facts == {"facts": {"nested": {"value": 1}}}
    assert normalized_visualizations == {
        "visualizations": [{"kind": "future", "data": {"points": [1, 2]}}]
    }
    assert combined == {
        "facts": {"nested": {"value": 1}},
        "interpretation": "## Result",
        "visualizations": [{"kind": "future", "data": {"points": [1, 2]}}],
    }


@pytest.mark.parametrize(
    ("value", "message"),
    [
        ({"facts": []}, "facts"),
        ({"interpretation": {}}, "interpretation"),
        ({"visualizations": {}}, "visualizations"),
        (["not", "a", "dict"], "dict or None"),
    ],
)
def test_normalize_analysis_result_rejects_invalid_contracts(value, message):
    with pytest.raises(TypeError, match=message):
        normalize_analysis_result(value)
