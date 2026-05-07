"""Registro central de modelos.

Flujo recomendado para añadir un nuevo modelo:
1. Implementar la lógica `run_*` en `models/`.
2. Definir el request schema en `schemas/model_requests.py` con `json_schema_extra`.
3. Crear un handler en `services/model_handlers.py`.
4. Definir ejemplos de respuesta en `registry/response_examples.py`.
5. Registrar una entrada `ModelDefinition` en `registry/model_definitions.py`.

Este módulo mantiene nombres históricos (`MODEL_REGISTRY`, `MODEL_MANIFEST_METADATA`
y `ModelRouteRegistration`) para no romper imports existentes durante el refactor.
"""

from typing import Any

from ApiModels.registry.model_definitions import MODEL_DEFINITIONS, ModelDefinition

ModelRouteRegistration = ModelDefinition
MODEL_REGISTRY = MODEL_DEFINITIONS

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
    "default": None,
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
}


def _normalize_parameter_definition(parameter: dict[str, Any]) -> dict[str, Any]:
    """Normaliza un parámetro al contrato público sin alterar su forma base."""

    normalized = dict(parameter)
    normalized["scope"] = normalized.get("scope") or "global"

    if normalized.get("semanticRole") is None:
        normalized.pop("semanticRole", None)

    return normalized


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
    """Expande tipos de dominio soportados al formato público del manifest."""

    if not domain_types:
        return None

    return {
        "numeric": {
            "enabled": "numeric" in domain_types,
            "range": {
                "min": None,
                "max": None,
            },
        },
        "linguistic": {
            "enabled": "linguistic" in domain_types,
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


def _build_metadata_entry(model: ModelDefinition) -> dict[str, Any]:
    """Convierte una definición limpia al formato histórico de metadata."""

    return {
        "modelFamilyKey": model.family_key,
        "modelVersion": model.model_version,
        "versionLabel": model.version_label,
        "displayName": model.display_name,
        "aliases": model.aliases,
        "role": model.role,
        "status": model.status,
        "publicInIssueCatalog": model.public_in_issue_catalog,
        "evaluationStructure": model.evaluation_structure,
        "lifecycleKind": model.lifecycle_kind,
        "isConsensus": model.is_consensus,
        "isMultiCriteria": model.is_multi_criteria,
        "inputKind": model.input_kind,
        "outputKind": model.output_kind,
        "supportsScenarios": model.supports_scenarios,
        "inputFields": model.input_fields,
        "outputFields": model.output_fields,
        "parameters": _build_parameters(model),
        "criterionTypes": _CRITERION_TYPES if model.uses_criterion_types else None,
        "supportedDomains": _build_supported_domains(model.supported_expression_domains),
        "moreInfoUrl": model.more_info_url,
        "sync": _build_sync(model.sync_as_issue_model),
    }


MODEL_MANIFEST_METADATA: dict[str, dict[str, Any]] = {
    model.key: _build_metadata_entry(model)
    for model in MODEL_DEFINITIONS
}
