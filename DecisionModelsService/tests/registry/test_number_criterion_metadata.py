from models.promethee_vi.definition import MODEL_DEFINITION as PROMETHEE_VI_DEFINITION


def test_promethee_vi_number_criterion_metadata_is_canonical():
    parameters = [
        parameter
        for parameter in PROMETHEE_VI_DEFINITION.parameters
        if parameter.get("parameterStructureKey") == "numberCriterion"
    ]

    assert [(parameter["key"], parameter["default"]) for parameter in parameters] == [
        ("q", 0.05),
        ("s", 0.10),
        ("p", 0.20),
        ("w_lower", 1),
        ("w_upper", 1),
    ]
    for parameter in parameters:
        assert parameter["scope"] == "perCriterion"
        assert parameter["restrictions"] == {"min": 0, "max": None}
        assert isinstance(parameter["default"], (int, float))
        assert not isinstance(parameter["default"], bool)
        assert parameter["default"] >= parameter["restrictions"]["min"]
