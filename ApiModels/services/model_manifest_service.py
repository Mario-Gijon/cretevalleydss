"""Construcción del manifest técnico de modelos.

El manifest público mantiene el contrato usado por Backend/Frontend, pero se
construye desde `MODEL_DEFINITIONS` para evitar duplicar metadata pesada en cada
modelo registrado.
"""

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

_ADMIN_PRESERVED_FIELDS = [
    "smallDescription",
    "extendDescription",
    "moreInfoUrl",
]

_ISSUE_MODEL_TECHNICAL_FIELDS = [
    "modelFamilyKey",
    "modelVersion",
    "versionLabel",
    "parameters",
    "evaluationStructure",
    "lifecycleKind",
    "inputKind",
    "outputKind",
    "criterionTypes",
    "supportedDomains",
    "supportsScenarios",
    "isConsensus",
    "isMultiCriteria",
]

_CRITERION_TYPES = {
    "canonical": ["max", "min"],
    "aliases": {
        "benefit": "max",
        "cost": "min",
    },
}

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


def _get_request_example(schema: dict[str, Any]) -> dict[str, Any] | None:
    """Extrae el ejemplo principal del JSON Schema de Pydantic."""

    example = schema.get("example")
    return example if isinstance(example, dict) else None


def _get_response_data_keys(response_examples: dict[str, Any]) -> list[str]:
    """Deduce claves principales de data desde el ejemplo de éxito."""

    success_value = response_examples.get("success", {}).get("value", {})
    data = success_value.get("data")

    if not isinstance(data, dict):
        return []

    return sorted(data.keys())


def _build_sync(sync_as_issue_model: bool) -> dict[str, Any]:
    """Construye metadata de sincronización compatible con el contrato actual."""

    return {
        "safeToCreateIssueModel": sync_as_issue_model,
        "safeTechnicalFields": (
            _ISSUE_MODEL_TECHNICAL_FIELDS if sync_as_issue_model else []
        ),
        "preserveAdminFields": _ADMIN_PRESERVED_FIELDS,
    }


def _build_supported_domains(domain_types: list[str]) -> dict[str, Any] | None:
    """Expande tipos de dominio soportados al formato público del manifest.

    El modelo solo declara si trabaja con valores numéricos o lingüísticos. Los
    rangos concretos, número de etiquetas o restricciones del dominio pertenecen
    al dominio de expresión configurado en el problema, no al modelo.
    """

    if not domain_types:
        return None

    normalized_domain_types = {
        domain_type.strip().lower()
        for domain_type in domain_types
        if domain_type.strip()
    }

    return {
        "numeric": {
            "enabled": "numeric" in normalized_domain_types,
            "range": {
                "min": None,
                "max": None,
            },
        },
        "linguistic": {
            "enabled": "linguistic" in normalized_domain_types,
            "minLabels": None,
            "maxLabels": None,
            "oddOnly": False,
        },
    }


def _build_parameters(model: ModelDefinition) -> list[dict[str, Any]]:
    """Genera la lista pública de parámetros desde flags simples del modelo."""

    parameters: list[dict[str, Any]] = []

    if model.uses_weights:
        parameters.append(_normalize_parameter_definition(_WEIGHTS_PARAMETER))

    if model.uses_fuzzy_weights:
        parameters.append(_normalize_parameter_definition(_FUZZY_WEIGHTS_PARAMETER))

    parameters.extend(
        _normalize_parameter_definition(parameter)
        for parameter in model.parameters
    )
    return parameters


def _build_manifest_entry(model: ModelDefinition) -> dict[str, Any]:
    """Convierte una definición de modelo al formato público del manifest."""

    request_schema = model.request_model.model_json_schema()
    supported_domains = _build_supported_domains(model.supported_expression_domains)

    return {
        "key": model.key,
        "modelFamilyKey": model.family_key,
        "modelVersion": model.model_version,
        "versionLabel": model.version_label,
        "displayName": model.display_name,
        "aliases": model.aliases,
        "role": model.role,
        "status": model.status,
        "publicInIssueCatalog": model.public_in_issue_catalog,
        "endpoint": {
            "method": "POST",
            "path": model.path,
            "operationId": model.operation_id,
        },
        "documentation": {
            "summary": model.summary,
            "description": model.description,
            "moreInfoUrl": model.more_info_url,
        },
        "catalog": {
            "smallDescription": model.small_description or model.summary,
            "extendDescription": model.extend_description or model.description,
            "moreInfoUrl": model.more_info_url,
        },
        "capabilities": {
            "evaluationStructure": model.evaluation_structure,
            "lifecycleKind": model.lifecycle_kind,
            "isConsensus": model.is_consensus,
            "isMultiCriteria": model.is_multi_criteria,
            "inputKind": model.input_kind,
            "outputKind": model.output_kind,
            "supportsScenarios": model.supports_scenarios,
            "supportedDomains": supported_domains,
        },
        "parameters": _build_parameters(model),
        "criterionTypes": _CRITERION_TYPES if model.uses_criterion_types else None,
        "inputFields": model.input_fields,
        "outputFields": model.output_fields,
        "request": {
            "schemaName": model.request_model.__name__,
            "required": request_schema.get("required", []),
            "jsonSchema": request_schema,
            "example": _get_request_example(request_schema),
        },
        "response": {
            "contract": "success/message/data/error",
            "dataKeys": _get_response_data_keys(model.response_examples),
            "examples": model.response_examples,
        },
        "sync": _build_sync(model.sync_as_issue_model),
    }


def build_model_manifest() -> dict[str, Any]:
    """Construye el manifest técnico read-only desde las definiciones de ApiModels."""

    return {
        "manifestVersion": MANIFEST_VERSION,
        "apiVersion": API_VERSION,
        "contract": API_CONTRACT,
        "models": [_build_manifest_entry(model) for model in MODEL_DEFINITIONS],
    }
