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

_CRITERION_TYPES = ["max", "min"]

_WEIGHTS_PARAMETER = {
    "key": "weights",
    "label": "Criteria weights",
    "description": "Relative importance assigned to each leaf criterion.",
    "required": True,
    "type": "array",
    "scope": "perCriterion",
    "semanticRole": "criteriaWeights",
    "default": "equal",
    "restrictions": {
        "min": 0,
        "max": 1,
        "length": "matchCriteria",
        "itemType": "number",
        "sum": 1,
        "normalize": False,
        "ordered": None,
        "allowed": None,
    },
    "ui": {
        "component": "criteriaWeights",
        "showCriterionNames": True,
    },
}

_FUZZY_WEIGHTS_PARAMETER = {
    "key": "weights",
    "label": "Criteria fuzzy weights",
    "required": True,
    "type": "fuzzyArray",
    "scope": "perCriterion",
    "semanticRole": "criteriaWeights",
    "default": "equal",
    "restrictions": {
        "min": 0,
        "max": 1,
        "length": "matchCriteria",
        "itemType": "fuzzyNumber",
        "ordered": "nonDecreasing",
        "sum": None,
        "normalize": None,
        "allowed": None,
    },
    "ui": {
        "component": "fuzzyCriteriaWeights",
        "showCriterionNames": True,
    },
}


def _normalize_parameter_definition(parameter: dict[str, Any]) -> dict[str, Any]:
    """Normaliza un parámetro al contrato público sin alterar su forma base."""

    normalized = dict(parameter)
    normalized["scope"] = normalized.get("scope") or "global"

    if normalized.get("semanticRole") is None:
        normalized.pop("semanticRole", None)

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
        "linguistic": "linguistic" in normalized_domain_types,
    }


def _build_parameters(model: ModelDefinition) -> list[dict[str, Any]]:
    """Genera la lista pública de parámetros desde flags simples del modelo."""

    parameters: list[dict[str, Any]] = []

    if model.uses_weights:
        parameters.append(_normalize_parameter_definition(_WEIGHTS_PARAMETER))

    if model.uses_fuzzy_weights:
        parameters.append(_normalize_parameter_definition(_FUZZY_WEIGHTS_PARAMETER))

    parameters.extend(_normalize_parameter_definition(parameter) for parameter in model.parameters)
    return parameters


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
        "evaluationStructure": model.evaluation_structure,
        "lifecycleKind": model.lifecycle_kind,
        "apiInputFormat": model.api_input_format,
        "apiOutputFormat": model.api_output_format,
        "isMultiCriteria": model.is_multi_criteria,
        "supportedDomains": _build_supported_domains(model.supported_domains),
        "criterionTypes": _CRITERION_TYPES if model.uses_criterion_types else None,
        "parameters": _build_parameters(model),
        "modelInputFields": list(model.model_input_fields),
        "modelOutputFields": list(model.model_output_fields),
        "request": {
            "contentType": "application/json",
            "bodyFields": list(model.request_body_fields),
            "example": _get_request_example(model),
        },
        "response": {
            "dataFields": list(model.model_output_fields),
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
