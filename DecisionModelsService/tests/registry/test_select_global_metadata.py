from models.herrera_viedma_crp.definition import (
    MODEL_DEFINITION as HERRERA_VIEDMA_DEFINITION,
)


def test_current_select_global_parameters_declare_typed_closed_options():
    parameters = [
        parameter
        for parameter in HERRERA_VIEDMA_DEFINITION.parameters
        if parameter.get("parameterStructureKey") == "selectGlobal"
    ]

    assert len(parameters) == 1
    parameter = parameters[0]
    assert parameter["key"] == "b"
    assert "scope" not in parameter
    assert parameter["valueType"] == "number"
    assert parameter["restrictions"]["allowed"] == [0.5, 0.7, 0.9, 1]
    assert parameter["default"] == 1
    assert parameter["default"] in parameter["restrictions"]["allowed"]
    assert all(
        isinstance(value, (int, float)) and not isinstance(value, bool)
        for value in parameter["restrictions"]["allowed"]
    )
