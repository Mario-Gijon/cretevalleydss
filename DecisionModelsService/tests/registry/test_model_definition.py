import pytest

from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest


def _handler(_payload):
    return {
        "success": True,
        "message": "ok",
        "data": {},
        "error": None,
    }


def _build_definition(**overrides) -> ModelDefinition:
    data = {
        "api_model_key": "demo_model",
        "api_endpoint_path": "/demo_model",
        "request_model": GenericModelExecutionRequest,
        "handler": _handler,
        "display_name": "Demo Model",
        "small_description": "Small description",
        "extended_description": "Extended description",
        "evaluation_structure_key": "alternativeCriteriaMatrix",
    }
    data.update(overrides)
    return ModelDefinition(**data)


def test_valid_issue_model_definition():
    definition = _build_definition()

    assert definition.model_kind == "issue"
    assert definition.implementation_status == "ready"


def test_model_definition_accepts_valid_model_section():
    definition = _build_definition(
        model_section={
            "whatItDoes": "Explains the model.",
            "whenToUse": "Use it for this decision.",
            "advantages": ["Simple to explain."],
            "limitations": ["Needs suitable data."],
        }
    )

    assert definition.model_section["whatItDoes"] == "Explains the model."


def test_model_definition_accepts_empty_model_section():
    assert _build_definition(model_section={}).model_section == {}


@pytest.mark.parametrize(
    "model_section",
    [
        [],
        {"whatItDoes": "", "whenToUse": "Use it.", "advantages": [], "limitations": []},
        {"whatItDoes": "Does it.", "whenToUse": "", "advantages": [], "limitations": []},
        {"whatItDoes": "Does it.", "whenToUse": "Use it.", "advantages": "one", "limitations": []},
        {"whatItDoes": "Does it.", "whenToUse": "Use it.", "advantages": [""], "limitations": []},
    ],
)
def test_model_definition_rejects_invalid_model_section(model_section):
    with pytest.raises(ValueError, match="model_section"):
        _build_definition(model_section=model_section)


def test_valid_criteria_weighting_definition_with_creator_side_support():
    definition = _build_definition(
        model_kind="criteriaWeighting",
        evaluation_structure_key="manualCriteriaWeights",
        supports_creator_criteria_weighting=True,
        supports_expert_criteria_weighting=False,
    )

    assert definition.supports_creator_criteria_weighting is True
    assert definition.supports_expert_criteria_weighting is False


def test_valid_criteria_weighting_definition_with_expert_side_support():
    definition = _build_definition(
        model_kind="criteriaWeighting",
        evaluation_structure_key="bestWorstCriteria",
        supports_creator_criteria_weighting=False,
        supports_expert_criteria_weighting=True,
    )

    assert definition.supports_creator_criteria_weighting is False
    assert definition.supports_expert_criteria_weighting is True


@pytest.mark.parametrize(
    ("overrides", "message_fragment"),
    [
        ({"implementation_status": "draft"}, "invalid implementation_status"),
        ({"model_kind": "ranking"}, "requires model_kind"),
        ({"evaluation_structure_key": ""}, "non-empty evaluation_structure_key"),
        ({"evaluation_structure_key": "   "}, "non-empty evaluation_structure_key"),
        (
            {
                "model_kind": "criteriaWeighting",
                "evaluation_structure_key": "manualCriteriaWeights",
                "supports_creator_criteria_weighting": "yes",
                "supports_expert_criteria_weighting": False,
            },
            "requires boolean criteria-weighting capability flags",
        ),
        (
            {
                "model_kind": "criteriaWeighting",
                "evaluation_structure_key": "manualCriteriaWeights",
                "supports_creator_criteria_weighting": False,
                "supports_expert_criteria_weighting": "no",
            },
            "requires boolean criteria-weighting capability flags",
        ),
        (
            {
                "model_kind": "criteriaWeighting",
                "evaluation_structure_key": "manualCriteriaWeights",
                "supports_creator_criteria_weighting": False,
                "supports_expert_criteria_weighting": False,
            },
            "must support creator-side or expert-side criteria weighting",
        ),
    ],
)
def test_model_definition_validation_errors(overrides, message_fragment):
    with pytest.raises(ValueError, match=message_fragment):
        _build_definition(**overrides)
