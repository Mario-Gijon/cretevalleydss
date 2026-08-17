from models.topsis_2tuple.analysis import visualizations as topsis_visualizations


def test_topsis_visualization_sections_keep_only_semantically_coherent_views_together(
    monkeypatch,
):
    keys = [
        "topsis-ideal-distances",
        "positive-distance-contributions",
        "negative-distance-contributions",
        "collective-beta-heatmap",
        "alpha-heatmap",
        "criterion-weighted-discrimination",
        "evaluator-alignment",
        "evaluator-disagreement-heatmap",
        "loeo-rank-impact",
        "loco-rank-impact",
        "criterion-weight-sensitivity-c1",
        "criterion-weight-sensitivity-c2",
        "evaluator-weight-sensitivity-e1",
    ]
    monkeypatch.setattr(
        topsis_visualizations,
        "build_visualizations",
        lambda _facts: [{"key": key} for key in keys],
    )

    sections = {
        section["id"]: [item["key"] for item in section["visualizations"]]
        for section in topsis_visualizations.build_visualization_sections({})
    }
    presentation = {
        section["id"]: section.get("presentation") for section in topsis_visualizations.build_visualization_sections({})
    }

    assert sections["ideal-distances"] == [
        "topsis-ideal-distances",
        "positive-distance-contributions",
        "negative-distance-contributions",
    ]
    assert sections["evaluator-disagreement"] == [
        "evaluator-alignment",
        "evaluator-disagreement-heatmap",
    ]
    assert sections["evaluator-influence"] == ["loeo-rank-impact"]
    assert sections["criterion-influence"] == ["loco-rank-impact"]
    assert sections["criterion-weight-sensitivity"] == [
        "criterion-weight-sensitivity-c1",
        "criterion-weight-sensitivity-c2",
    ]
    assert sections["evaluator-weight-sensitivity"] == [
        "evaluator-weight-sensitivity-e1"
    ]
    assert presentation["criterion-weight-sensitivity"] == {"layout": "stacked"}
