from typing import Any

from registry.model_registry import MODEL_MANIFEST_METADATA, MODEL_REGISTRY
from schemas.model_manifest import (
    CriterionTypesInfo,
    ManifestResponseData,
    ModelCapabilities,
    ModelDocumentationInfo,
    ModelEndpointInfo,
    ModelManifestEntry,
    ModelParameter,
    ModelRequestInfo,
    ModelResponseInfo,
    ModelSyncInfo,
    SupportedDomains,
)


MANIFEST_VERSION = "1.0"
API_VERSION = "1.0.0"
API_CONTRACT = {
    "success": "boolean",
    "message": "string",
    "data": "object|null",
    "error": "object|null",
}


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


def _build_manifest_entry(registration) -> ModelManifestEntry:
    metadata = MODEL_MANIFEST_METADATA[registration.name]
    request_schema = registration.request_model.model_json_schema()

    return ModelManifestEntry(
        key=registration.name,
        displayName=metadata["displayName"],
        aliases=metadata["aliases"],
        role=metadata["role"],
        status=metadata["status"],
        publicInIssueCatalog=metadata["publicInIssueCatalog"],
        endpoint=ModelEndpointInfo(
            method="POST",
            path=registration.path,
            operationId=registration.operation_id,
        ),
        documentation=ModelDocumentationInfo(
            summary=registration.summary,
            description=registration.description,
            moreInfoUrl=metadata.get("moreInfoUrl"),
        ),
        capabilities=ModelCapabilities(
            evaluationStructure=metadata.get("evaluationStructure"),
            isConsensus=metadata.get("isConsensus"),
            isMultiCriteria=metadata.get("isMultiCriteria"),
            inputKind=metadata["inputKind"],
            outputKind=metadata["outputKind"],
            supportsScenarios=metadata["supportsScenarios"],
            supportedDomains=(
                SupportedDomains.model_validate(metadata["supportedDomains"])
                if metadata.get("supportedDomains") is not None
                else None
            ),
        ),
        parameters=[
            ModelParameter.model_validate(parameter)
            for parameter in metadata.get("parameters", [])
        ],
        criterionTypes=(
            CriterionTypesInfo.model_validate(metadata["criterionTypes"])
            if metadata.get("criterionTypes") is not None
            else None
        ),
        request=ModelRequestInfo(
            schemaName=registration.request_model.__name__,
            required=request_schema.get("required", []),
            jsonSchema=request_schema,
            example=_get_request_example(request_schema),
        ),
        response=ModelResponseInfo(
            dataKeys=_get_response_data_keys(registration.response_examples),
            examples=registration.response_examples,
        ),
        sync=ModelSyncInfo.model_validate(metadata["sync"]),
    )


def build_model_manifest() -> ManifestResponseData:
    """Construye el manifest técnico read-only desde el registry de ApiModels."""

    return ManifestResponseData(
        manifestVersion=MANIFEST_VERSION,
        apiVersion=API_VERSION,
        contract=API_CONTRACT,
        models=[
            _build_manifest_entry(registration)
            for registration in MODEL_REGISTRY
        ],
    )
