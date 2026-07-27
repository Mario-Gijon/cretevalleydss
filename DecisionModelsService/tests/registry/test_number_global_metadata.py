from models.herrera_viedma_crp.definition import (
    MODEL_DEFINITION as HERRERA_VIEDMA_DEFINITION,
)
from models.promethee_vi.definition import MODEL_DEFINITION as PROMETHEE_VI_DEFINITION
from models.vikor.definition import MODEL_DEFINITION as VIKOR_DEFINITION
from models.waspas.definition import MODEL_DEFINITION as WASPAS_DEFINITION


DEFINITIONS = (
    VIKOR_DEFINITION,
    WASPAS_DEFINITION,
    PROMETHEE_VI_DEFINITION,
    HERRERA_VIEDMA_DEFINITION,
)


def _number_global_parameters(definition):
    return [
        parameter
        for parameter in definition.parameters
        if parameter.get("parameterStructureKey") == "numberGlobal"
    ]


def test_all_current_number_global_parameters_declare_canonical_metadata():
    parameters = [
        parameter
        for definition in DEFINITIONS
        for parameter in _number_global_parameters(definition)
    ]

    assert len(parameters) == 4
    for parameter in parameters:
        assert parameter["scope"] == "global"
        assert parameter["valueType"] in {"number", "integer"}
        assert isinstance(parameter["required"], bool)
        assert set(parameter["restrictions"]) == {"min", "max", "allowed"}


def test_current_number_global_semantics_and_defaults_are_unchanged():
    expected = {
        ("vikor", "v"): ("number", 0.5),
        ("waspas", "lambda"): ("number", 0.5),
        ("promethee_vi", "iterations"): ("integer", 1000),
        ("herrera_viedma_crp", "beta"): ("number", 0.8),
    }

    actual = {
        (definition.api_model_key, parameter["key"]): (
            parameter["valueType"],
            parameter["default"],
        )
        for definition in DEFINITIONS
        for parameter in _number_global_parameters(definition)
    }

    assert actual == expected
