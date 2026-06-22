from pathlib import Path

from schemas.scaffold_common import ScaffoldedFile
from schemas.scaffold_evaluation_structure import (
    EvaluationStructureScaffoldPreviewRequest,
    EvaluationStructureScaffoldPreviewResponse,
)
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
) -> dict[str, str]:
    names = build_evaluation_structure_scaffold_names(request)

    return {
        "evaluation_structure_key": names.evaluation_structure_key,
        "stage_constant": request.stageConstant,
        "backend_structure_export_name": names.backend_structure_export_name,
        "view_component_name": names.view_component_name,
    }


def build_evaluation_structure_scaffold_preview(
    request: EvaluationStructureScaffoldPreviewRequest,
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
    placeholders = _build_placeholder_values(request)

    template_map = [
        ("backend-index.js.template", f"{backend_target_base_path}/index.js"),
        ("frontend-index.js.template", f"{frontend_target_base_path}/index.js"),
        (
            "frontend-view.jsx.template",
            f"{frontend_target_base_path}/{names.view_component_name}.jsx",
        ),
    ]

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
