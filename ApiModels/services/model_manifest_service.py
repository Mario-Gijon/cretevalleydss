"""Construcción del manifest técnico de modelos."""

from typing import Any

from registry.model_definitions import MODEL_DEFINITIONS, ModelDefinition

MANIFEST_VERSION = "1.0"
API_VERSION = "1.0.0"
API_CONTRACT = {
    "success": "boolean",
    "message": "string",
    "data": "object|null",
    "error": "object|null",
}


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
    """Extrae el ejemplo principal del JSON Schema de Pydantic."""

    schema = model.request_model.model_json_schema()
    example = schema.get("example")

    return example if isinstance(example, dict) else None


def _get_response_example(model: ModelDefinition) -> dict[str, Any] | None:
    """Extrae el ejemplo principal de éxito del modelo."""

    success_value = model.response_examples.get("success", {}).get("value")

    return success_value if isinstance(success_value, dict) else None


def _build_manifest_entry(model: ModelDefinition) -> dict[str, Any]:
    """Convierte una definición de modelo al formato público canónico del manifest."""

    return {
        "apiModelKey": model.api_model_key,
        "displayName": model.display_name,
        "modelFamilyKey": model.family_key,
        "modelVersion": model.model_version,
        "versionLabel": model.version_label,
        "isIssueModel": model.is_issue_model,
        "apiEndpoint": {
            "method": "POST",
            "path": model.api_endpoint_path,
            "operationId": model.operation_id,
        },
        "smallDescription": model.small_description,
        "extendDescription": model.extend_description,
        "moreInfoUrl": model.more_info_url,
        "alternativeEvaluationStructureKey": model.alternative_evaluation_structure_key,
        "supportsConsensus": model.supports_consensus,
        "isMultiCriteria": model.is_multi_criteria,
        "usesCriteriaWeights": model.uses_criteria_weights,
        "usesFuzzyCriteriaWeights": model.uses_fuzzy_criteria_weights,
        "usesCriterionTypes": model.uses_criterion_types,
        "supportedDomains": _build_supported_domains(model.supported_domains),
        "criterionTypes": list(model.criterion_types) if model.criterion_types else None,
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
    """Construye el manifest técnico read-only desde las definiciones de ApiModels."""

    return {
        "manifestVersion": MANIFEST_VERSION,
        "apiVersion": API_VERSION,
        "contract": API_CONTRACT,
        "models": [_build_manifest_entry(model) for model in MODEL_DEFINITIONS],
    }
