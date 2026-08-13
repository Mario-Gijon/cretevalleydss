import json
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
def _load_template(template_filename: str) -> str:
    return (PARAMETER_TEMPLATES_DIR / template_filename).read_text(encoding="utf-8")


def _to_kebab_case(value: str) -> str:
    return "".join(
        f"-{character.lower()}" if character.isupper() else character
        for character in value
    )


def _load_structure_scaffold_adapter(
    parameter_structure_key: str,
) -> list[dict[str, str]] | None:
    adapter_path = (
        PARAMETER_TEMPLATES_DIR
        / _to_kebab_case(parameter_structure_key)
        / "scaffold.json"
    )
    if not adapter_path.is_file():
        return None
    return json.loads(adapter_path.read_text(encoding="utf-8"))


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

    dedicated_templates = _load_structure_scaffold_adapter(
        names.parameter_structure_key
    )
    if dedicated_templates is not None:
        template_map = [
            (
                template["template"],
                f"{backend_target_base_path}/{template['output']}"
                if template["target"] == "backend"
                else f"{frontend_target_base_path}/{template['output']}",
            )
            for template in dedicated_templates
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

    template_map.extend(
        [
            (
                "backend-implementation-guide.md.template",
                f"{backend_target_base_path}/IMPLEMENTATION_GUIDE.md",
            ),
            (
                "frontend-implementation-guide.md.template",
                f"{frontend_target_base_path}/IMPLEMENTATION_GUIDE.md",
            ),
        ]
    )

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
