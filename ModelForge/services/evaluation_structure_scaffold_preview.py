from pathlib import Path

from schemas.scaffold_common import ScaffoldedFile
from schemas.scaffold_evaluation_structure import (
    EvaluationStructureScaffoldPreviewRequest,
    EvaluationStructureScaffoldPreviewResponse,
)
from schemas.scaffold_model import ModelScaffoldPreviewRequest
from services.evaluation_structure_scaffold_names import (
    build_evaluation_structure_scaffold_names,
)
from services.template_renderer import render_template_strict


EVALUATION_STRUCTURE_TEMPLATES_DIR = (
    Path(__file__).resolve().parent.parent / "templates" / "evaluation-structure"
)


def _load_template(template_filename: str) -> str:
    return (EVALUATION_STRUCTURE_TEMPLATES_DIR / template_filename).read_text(
        encoding="utf-8"
    )


def _build_placeholder_values(
    request: EvaluationStructureScaffoldPreviewRequest,
    *,
    scaffold_creator_api_operations: bool,
) -> dict[str, str]:
    names = build_evaluation_structure_scaffold_names(request)

    return {
        "evaluation_structure_key": names.evaluation_structure_key,
        "stage_constant": request.stageConstant,
        "backend_structure_export_name": names.backend_structure_export_name,
        "get_function_name": names.get_function_name,
        "save_function_name": names.save_function_name,
        "remap_criterion_ids_function_name": (
            names.remap_criterion_ids_function_name
        ),
        "view_component_name": names.view_component_name,
        "build_initial_evaluation_import": (
            'import { buildInitialEvaluation } from '
            '"./operations/buildInitialEvaluation";'
            if scaffold_creator_api_operations
            else ""
        ),
        "build_initial_evaluation_registry_field": (
            "  buildInitialEvaluation,"
            if scaffold_creator_api_operations
            else ""
        ),
        "remap_criterion_ids_import": (
            "\nimport {\n"
            f"  {names.remap_criterion_ids_function_name},\n"
            '} from "./operations/remapCriterionIds.js";'
            if scaffold_creator_api_operations
            else ""
        ),
        "remap_criterion_ids_registry_field": (
            "\n"
            "  remapCriterionIds: "
            f"{names.remap_criterion_ids_function_name},"
            if scaffold_creator_api_operations
            else ""
        ),
    }


def _should_scaffold_creator_api_operations(
    *,
    request: EvaluationStructureScaffoldPreviewRequest,
    model: ModelScaffoldPreviewRequest | None,
) -> bool:
    if model is None:
        return False

    return (
        request.stageConstant == "CRITERIA_WEIGHTING"
        and model.modelKind == "criteriaWeighting"
        and model.supportsCreatorCriteriaWeighting is True
        and model.apiModelKey != "manual_criteria_weights"
        and request.evaluationStructureKey != "manualCriteriaWeights"
    )


def build_evaluation_structure_scaffold_preview(
    request: EvaluationStructureScaffoldPreviewRequest,
    *,
    model: ModelScaffoldPreviewRequest | None = None,
) -> EvaluationStructureScaffoldPreviewResponse:
    names = build_evaluation_structure_scaffold_names(request)
    backend_target_base_path = (
        "Backend/modules/decisionPlugins/evaluations/structures/"
        f"{names.evaluation_structure_key}"
    )
    frontend_target_base_path = (
        "Frontend/src/features/decisionPlugins/evaluations/structures/"
        f"{names.evaluation_structure_key}"
    )
    scaffold_creator_api_operations = _should_scaffold_creator_api_operations(
        request=request,
        model=model,
    )
    placeholders = _build_placeholder_values(
        request,
        scaffold_creator_api_operations=scaffold_creator_api_operations,
    )

    template_map = [
        ("backend-index.js.template", f"{backend_target_base_path}/index.js"),
        (
            "backend-get.js.template",
            f"{backend_target_base_path}/{names.evaluation_structure_key}.get.js",
        ),
        (
            "backend-save.js.template",
            f"{backend_target_base_path}/{names.evaluation_structure_key}.save.js",
        ),
        (
            "backend-implementation-guide.md.template",
            f"{backend_target_base_path}/IMPLEMENTATION_GUIDE.md",
        ),
    ]
    if scaffold_creator_api_operations:
        template_map.append(
            (
                "backend-remap-criterion-ids.js.template",
                f"{backend_target_base_path}/operations/remapCriterionIds.js",
            )
        )

    template_map.extend([
        ("frontend-index.js.template", f"{frontend_target_base_path}/index.js"),
        (
            "frontend-view.jsx.template",
            f"{frontend_target_base_path}/{names.view_component_name}.jsx",
        ),
        (
            "frontend-implementation-guide.md.template",
            f"{frontend_target_base_path}/IMPLEMENTATION_GUIDE.md",
        ),
    ])
    if scaffold_creator_api_operations:
        template_map.append(
            (
                "frontend-build-initial-evaluation.js.template",
                f"{frontend_target_base_path}/operations/buildInitialEvaluation.js",
            )
        )

    files = []
    for template_name, output_path in template_map:
        content = render_template_strict(_load_template(template_name), placeholders)
        files.append(ScaffoldedFile(path=output_path, content=content))

    return EvaluationStructureScaffoldPreviewResponse(
        service="model-forge",
        kind="evaluation-structure",
        mode="preview",
        backendTargetBasePath=backend_target_base_path,
        frontendTargetBasePath=frontend_target_base_path,
        files=files,
    )
