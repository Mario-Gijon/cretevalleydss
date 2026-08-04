from models.promethee_vi.definition import MODEL_DEFINITION as PROMETHEE_VI_DEFINITION


def test_promethee_vi_select_criterion_metadata_is_canonical():
    parameters = [
        parameter
        for parameter in PROMETHEE_VI_DEFINITION.parameters
        if parameter.get("parameterStructureKey") == "selectCriterion"
    ]

    assert len(parameters) == 1
    parameter = parameters[0]
    allowed = ["t1", "t2", "t3", "t4", "t5", "t6", "t7"]
    assert parameter["key"] == "f"
    assert parameter["label"] == "Preference functions"
    assert parameter["required"] is True
    assert parameter["valueType"] == "string"
    assert parameter["default"] == "t5"
    assert parameter["restrictions"] == {"allowed": allowed}
    assert "scope" not in parameter
    assert "valueType" not in parameter["restrictions"]
    assert "requiredForEachCriterion" not in parameter["restrictions"]
    assert parameter["default"] in allowed
    assert len(allowed) == len(set(allowed))
    assert all(isinstance(value, str) and value.strip() for value in allowed)
