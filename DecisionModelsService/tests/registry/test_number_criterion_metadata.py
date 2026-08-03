from models.promethee_vi.definition import MODEL_DEFINITION as PROMETHEE_VI_DEFINITION
from models.vikor.definition import MODEL_DEFINITION as VIKOR_DEFINITION
from models.waspas.definition import MODEL_DEFINITION as WASPAS_DEFINITION
from models.herrera_viedma_crp.definition import MODEL_DEFINITION as HERRERA_VIEDMA_CRP_DEFINITION
from models.aras.definition import MODEL_DEFINITION as ARAS_DEFINITION
from models.borda.definition import MODEL_DEFINITION as BORDA_DEFINITION
from models.bwm.definition import MODEL_DEFINITION as BWM_DEFINITION
from models.edas.definition import MODEL_DEFINITION as EDAS_DEFINITION
from models.fuzzy_topsis.definition import MODEL_DEFINITION as FUZZY_TOPSIS_DEFINITION
from models.manual_criteria_weights.definition import MODEL_DEFINITION as MANUAL_CRITERIA_WEIGHTS_DEFINITION
from models.marcos.definition import MODEL_DEFINITION as MARCOS_DEFINITION
from models.topsis.definition import MODEL_DEFINITION as TOPSIS_DEFINITION


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
        assert "scope" not in parameter
        assert parameter["restrictions"] == {"min": 0, "max": None}
        assert isinstance(parameter["default"], (int, float))
        assert not isinstance(parameter["default"], bool)
        assert parameter["default"] >= parameter["restrictions"]["min"]


def test_production_model_parameters_do_not_declare_scope():
    for definition in (
        PROMETHEE_VI_DEFINITION,
        VIKOR_DEFINITION,
        WASPAS_DEFINITION,
        HERRERA_VIEDMA_CRP_DEFINITION,
        ARAS_DEFINITION,
        BORDA_DEFINITION,
        BWM_DEFINITION,
        EDAS_DEFINITION,
        FUZZY_TOPSIS_DEFINITION,
        MANUAL_CRITERIA_WEIGHTS_DEFINITION,
        MARCOS_DEFINITION,
        TOPSIS_DEFINITION,
    ):
        assert all("scope" not in parameter for parameter in definition.parameters)
