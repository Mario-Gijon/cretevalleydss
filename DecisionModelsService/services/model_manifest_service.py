"""Construcción del manifest público de modelos."""

from typing import Any

from registry.model_definition import ModelDefinition
from registry.model_registry import MODEL_DEFINITIONS


def _normalize_parameter_definition(parameter: dict[str, Any]) -> dict[str, Any]:
    """Normaliza un parámetro al contrato público sin alterar su forma base."""

    normalized = dict(parameter)
    normalized["scope"] = normalized.get("scope") or "global"

    return normalized


def _build_supported_domains(domain_types: list[str]) -> dict[str, Any]:
    """Construye dominios soportados en forma canónica con subtipos numéricos."""

    normalized_domain_types = {
        domain_type.strip().lower()
        for domain_type in domain_types
        if domain_type.strip()
    }

    return {
        "numeric": {
            "continuous": "numericcontinuous" in normalized_domain_types,
            "discrete": "numericdiscrete" in normalized_domain_types,
        },
        "linguistic": ["triangular"] if "linguistic" in normalized_domain_types else [],
    }


def _build_parameters(model: ModelDefinition) -> list[dict[str, Any]]:
    """Genera la lista pública de parámetros declarados por el modelo."""

    return [_normalize_parameter_definition(parameter) for parameter in model.parameters]


def _get_request_example(model: ModelDefinition) -> dict[str, Any] | None:
    """Extrae el ejemplo principal de request declarado por el modelo."""

    first_example = next(iter(model.request_examples.values()), None)
    value = first_example.get("value") if isinstance(first_example, dict) else None

    return value if isinstance(value, dict) else None


def _get_response_example(model: ModelDefinition) -> dict[str, Any] | None:
    """Extrae el ejemplo principal de éxito del modelo."""

    success_value = model.response_examples.get("success", {}).get("value")

    return success_value if isinstance(success_value, dict) else None


def _build_manifest_entry(model: ModelDefinition) -> dict[str, Any]:
    """Convierte una definición de modelo al formato público canónico del manifest."""

    return {
        "apiModelKey": model.api_model_key,
        "displayName": model.display_name,
        "isIssueModel": model.is_issue_model,
        "isCriteriaWeightingModel": model.is_criteria_weighting_model,
        "supportsCreatorCriteriaWeighting": model.supports_creator_criteria_weighting,
        "supportsExpertCriteriaWeighting": model.supports_expert_criteria_weighting,
        "apiEndpoint": {
            "method": "POST",
            "path": model.api_endpoint_path,
        },
        "smallDescription": model.small_description,
        "extendedDescription": model.extended_description,
        "moreInfoUrl": model.more_info_url,
        "alternativeEvaluationStructureKey": model.alternative_evaluation_structure_key,
        "criteriaWeightingStructureKey": model.criteria_weighting_structure_key,
        "supportsConsensus": model.supports_consensus,
        "supportsConsensusSimulation": model.supports_consensus_simulation,
        "isMultiCriteria": model.is_multi_criteria,
        "usesCriteriaWeights": model.uses_criteria_weights,
        "usesExpertWeights": model.uses_expert_weights,
        "usesFuzzyCriteriaWeights": model.uses_fuzzy_criteria_weights,
        "usesCriterionTypes": model.uses_criterion_types,
        "supportedDomains": _build_supported_domains(model.supported_domains),
        "parameters": _build_parameters(model),
        "request": {
            "contentType": "application/json",
            "example": _get_request_example(model),
        },
        "response": {
            "example": _get_response_example(model),
        },
    }


def build_model_manifest() -> dict[str, Any]:
    """Construye el manifest read-only desde las definiciones de DecisionModelsService."""

    return {
        "models": [_build_manifest_entry(model) for model in MODEL_DEFINITIONS],
    }
