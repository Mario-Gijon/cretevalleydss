from pathlib import Path

from schemas.scaffold_evaluation_structure import (
    EvaluationStructureScaffoldPreviewRequest,
)
from schemas.scaffold_model_package import (
    ModelPackagePreviewItem,
    ModelPackagePreviewRequest,
    ModelPackagePreviewResponse,
)
from schemas.scaffold_parameter import ParameterScaffoldPreviewRequest
from services.evaluation_structure_scaffold_preview import (
    build_evaluation_structure_scaffold_preview,
)
from services.model_scaffold_preview import build_model_scaffold_preview
from services.parameter_scaffold_preview import build_parameter_scaffold_preview
from services.scaffold_existence import (
    StructureExistence,
    get_evaluation_structure_existence,
    get_model_existence,
    get_parameter_structure_existence,
)

MODEL_KIND_STAGE_CONSTANT = {
    "issue": "ALTERNATIVE_EVALUATION",
    "criteriaWeighting": "CRITERIA_WEIGHTING",
}


def build_model_package_preview(
    request: ModelPackagePreviewRequest, project_root: Path
) -> ModelPackagePreviewResponse:
    items: list[ModelPackagePreviewItem] = []

    items.append(_build_model_item(request, project_root))

    evaluation_requests = _collect_evaluation_structure_requests(request)
    for evaluation_request in evaluation_requests.values():
        items.append(
            _build_evaluation_structure_item(evaluation_request, project_root)
        )

    parameter_requests = _collect_parameter_structure_requests(request)
    for parameter_request in parameter_requests.values():
        items.append(_build_parameter_structure_item(parameter_request, project_root))

    return ModelPackagePreviewResponse(items=items)


def _build_model_item(
    request: ModelPackagePreviewRequest, project_root: Path
) -> ModelPackagePreviewItem:
    existence = get_model_existence(project_root, request.model.apiModelKey)

    if existence.status == "exists":
        return ModelPackagePreviewItem(
            kind="model",
            key=request.model.apiModelKey,
            status="exists",
            reason="Model scaffold already exists.",
            targetBasePath=None,
            files=[],
        )

    preview = build_model_scaffold_preview(request.model)
    return ModelPackagePreviewItem(
        kind="model",
        key=request.model.apiModelKey,
        status="toGenerate",
        reason=None,
        targetBasePath=preview.targetBasePath,
        files=preview.files,
    )


def _build_evaluation_structure_item(
    request: EvaluationStructureScaffoldPreviewRequest, project_root: Path
) -> ModelPackagePreviewItem:
    existence = get_evaluation_structure_existence(
        project_root, request.evaluationStructureKey
    )

    if existence.status == "exists":
        return ModelPackagePreviewItem(
            kind="evaluation-structure",
            key=request.evaluationStructureKey,
            status="exists",
            reason="Evaluation structure already exists in backend and frontend.",
            targetBasePath=None,
            files=[],
        )

    if existence.status == "partial":
        return ModelPackagePreviewItem(
            kind="evaluation-structure",
            key=request.evaluationStructureKey,
            status="partial",
            reason=_build_partial_reason("Evaluation structure", existence),
            targetBasePath=None,
            files=[],
        )

    preview = build_evaluation_structure_scaffold_preview(request)
    return ModelPackagePreviewItem(
        kind="evaluation-structure",
        key=request.evaluationStructureKey,
        status="toGenerate",
        reason=None,
        targetBasePath=preview.backendTargetBasePath,
        files=preview.files,
    )


def _build_parameter_structure_item(
    request: ParameterScaffoldPreviewRequest, project_root: Path
) -> ModelPackagePreviewItem:
    existence = get_parameter_structure_existence(
        project_root, request.parameterStructureKey
    )

    if existence.status == "exists":
        return ModelPackagePreviewItem(
            kind="parameter",
            key=request.parameterStructureKey,
            status="exists",
            reason="Parameter structure already exists in backend and frontend.",
            targetBasePath=None,
            files=[],
        )

    if existence.status == "partial":
        return ModelPackagePreviewItem(
            kind="parameter",
            key=request.parameterStructureKey,
            status="partial",
            reason=_build_partial_reason("Parameter structure", existence),
            targetBasePath=None,
            files=[],
        )

    preview = build_parameter_scaffold_preview(request)
    return ModelPackagePreviewItem(
        kind="parameter",
        key=request.parameterStructureKey,
        status="toGenerate",
        reason=None,
        targetBasePath=preview.backendTargetBasePath,
        files=preview.files,
    )


def _collect_evaluation_structure_requests(
    request: ModelPackagePreviewRequest,
) -> dict[str, EvaluationStructureScaffoldPreviewRequest]:
    requests: dict[str, EvaluationStructureScaffoldPreviewRequest] = {}

    model_key = request.model.evaluationStructureKey
    requests[model_key] = EvaluationStructureScaffoldPreviewRequest(
        evaluationStructureKey=model_key,
        stageConstant=MODEL_KIND_STAGE_CONSTANT[request.model.modelKind],
    )

    if request.evaluationStructure is not None:
        requests[request.evaluationStructure.evaluationStructureKey] = (
            request.evaluationStructure.model_copy(
                update={
                    "stageConstant": MODEL_KIND_STAGE_CONSTANT[
                        request.model.modelKind
                    ]
                }
            )
        )

    return requests


def _collect_parameter_structure_requests(
    request: ModelPackagePreviewRequest,
) -> dict[str, ParameterScaffoldPreviewRequest]:
    requests: dict[str, ParameterScaffoldPreviewRequest] = {}

    for parameter in request.model.parameters:
        parameter_structure_key = parameter.get("parameterStructureKey")
        if not isinstance(parameter_structure_key, str):
            continue

        normalized_key = parameter_structure_key.strip()
        if not normalized_key:
            continue

        requests[normalized_key] = ParameterScaffoldPreviewRequest(
            parameterStructureKey=normalized_key
        )

    for explicit_request in request.parameterStructures:
        requests[explicit_request.parameterStructureKey] = explicit_request

    return requests


def _build_partial_reason(label: str, existence: StructureExistence) -> str:
    backend_status = "exists" if existence.backend_exists else "missing"
    frontend_status = "exists" if existence.frontend_exists else "missing"
    return (
        f"{label} exists partially: backend is {backend_status} and frontend is "
        f"{frontend_status}."
    )
