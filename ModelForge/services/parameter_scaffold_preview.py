from pathlib import Path

from schemas.scaffold_common import ScaffoldedFile
from schemas.scaffold_parameter import (
    ParameterScaffoldPreviewRequest,
    ParameterScaffoldPreviewResponse,
)
from services.parameter_scaffold_names import build_parameter_scaffold_names
from services.template_renderer import render_template_strict


PARAMETER_TEMPLATES_DIR = (
    Path(__file__).resolve().parent.parent / "templates" / "parameter"
)
NUMBER_GLOBAL_TEMPLATE_MAP = [
    (
        "number-global/backend-index.js.template",
        "index.js",
    ),
    (
        "number-global/backend-validate-definition.js.template",
        "validateDefinition.js",
    ),
    (
        "number-global/backend-validate-and-normalize.js.template",
        "validateAndNormalize.js",
    ),
    (
        "number-global/frontend-index.js.template",
        "index.js",
    ),
    (
        "number-global/frontend-field.jsx.template",
        "NumberGlobalParameterField.jsx",
    ),
    (
        "number-global/frontend-field.styles.js.template",
        "NumberGlobalParameterField.styles.js",
    ),
    (
        "number-global/frontend-read-only.jsx.template",
        "NumberGlobalParameterReadOnly.jsx",
    ),
]


def _load_template(template_filename: str) -> str:
    return (PARAMETER_TEMPLATES_DIR / template_filename).read_text(encoding="utf-8")


def _build_placeholder_values(
    request: ParameterScaffoldPreviewRequest,
) -> dict[str, str]:
    names = build_parameter_scaffold_names(request)

    return {
        "parameter_structure_key": names.parameter_structure_key,
        "parameter_label": names.component_name,
        "component_name": names.component_name,
        "field_component_name": names.field_component_name,
        "read_only_component_name": names.read_only_component_name,
        "backend_structure_export_name": names.backend_structure_export_name,
        "validate_function_name": names.validate_function_name,
    }


def build_parameter_scaffold_preview(
    request: ParameterScaffoldPreviewRequest,
) -> ParameterScaffoldPreviewResponse:
    names = build_parameter_scaffold_names(request)
    backend_target_base_path = (
        "Backend/modules/decisionPlugins/modelParameters/structures/"
        f"{names.parameter_structure_key}"
    )
    frontend_target_base_path = (
        "Frontend/src/features/decisionPlugins/modelParameters/fields/"
        f"{names.parameter_structure_key}"
    )
    placeholders = _build_placeholder_values(request)

    if names.parameter_structure_key == "numberGlobal":
        template_map = [
            (
                template_name,
                (
                    f"{backend_target_base_path}/{relative_path}"
                    if template_name.startswith("number-global/backend-")
                    else f"{frontend_target_base_path}/{relative_path}"
                ),
            )
            for template_name, relative_path in NUMBER_GLOBAL_TEMPLATE_MAP
        ]
    else:
        template_map = [
            ("backend-index.js.template", f"{backend_target_base_path}/index.js"),
            ("backend-validate.js.template", f"{backend_target_base_path}/validate.js"),
            ("frontend-index.js.template", f"{frontend_target_base_path}/index.js"),
            (
                "frontend-field.jsx.template",
                f"{frontend_target_base_path}/{names.field_component_name}.jsx",
            ),
            (
                "frontend-read-only.jsx.template",
                f"{frontend_target_base_path}/{names.read_only_component_name}.jsx",
            ),
        ]

    files = []
    for template_name, output_path in template_map:
        content = render_template_strict(_load_template(template_name), placeholders)
        files.append(ScaffoldedFile(path=output_path, content=content))

    return ParameterScaffoldPreviewResponse(
        service="model-forge",
        kind="parameter",
        mode="preview",
        backendTargetBasePath=backend_target_base_path,
        frontendTargetBasePath=frontend_target_base_path,
        files=files,
    )
