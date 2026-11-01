from services.results_analysis.categorical_agreement_projection import (
    MAX_NORMALIZED_STRESS,
    build_categorical_agreement_projection,
)


def participant(kind, name, category_ids):
    return {"kind": kind, "name": name, "categoryIds": category_ids}


def coherent_patterns():
    return [
        participant("expert", "Ada", ["high", "low", "high", "low"]),
        participant("expert", "Grace", ["high", "high", "low", "low"]),
        participant("expert", "Katherine", ["low", "low", "high", "low"]),
        participant("collective", "Collective result", ["high", "low", "high", "low"]),
    ]


def test_projects_saved_categorical_patterns_with_a_transparent_mismatch_metric():
    projection = build_categorical_agreement_projection(coherent_patterns())

    assert projection is not None
    assert projection["type"] == "auxiliary_categorical_agreement_projection"
    assert projection["dissimilarity"] == "normalized_hamming_category_mismatch"
    assert projection["stress"] <= MAX_NORMALIZED_STRESS
    assert [point["name"] for point in projection["points"]] == [
        "Ada", "Grace", "Katherine", "Collective result",
    ]
    assert projection["points"][0]["exactCategoryMatches"] == 4
    assert projection["points"][1]["exactCategoryMatches"] == 2
    assert projection["points"][-1]["kind"] == "collective"
    assert all(isinstance(point[axis], float) for point in projection["points"] for axis in ("x", "y"))


def test_omits_projection_when_there_are_not_enough_experts_or_alternatives():
    patterns = coherent_patterns()
    assert build_categorical_agreement_projection(patterns[1:]) is None
    assert build_categorical_agreement_projection([
        {**item, "categoryIds": item["categoryIds"][:2]} for item in patterns
    ]) is None


def test_omits_projection_when_patterns_are_identical_or_two_dimensions_are_not_solid():
    identical = [participant("expert", f"Expert {index}", ["same"] * 5) for index in range(3)]
    identical.append(participant("collective", "Collective result", ["same"] * 5))
    assert build_categorical_agreement_projection(identical) is None

    equidistant = [participant("expert", f"Expert {index}", [f"category-{index}"] * 5) for index in range(4)]
    equidistant.append(participant("collective", "Collective result", ["category-4"] * 5))
    assert build_categorical_agreement_projection(equidistant) is None
