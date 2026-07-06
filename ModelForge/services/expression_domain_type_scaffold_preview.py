import json
import re
from pathlib import Path

from fastapi import HTTPException

from schemas.scaffold_common import ScaffoldedFile
from schemas.scaffold_expression_domain_type import (
    ExpressionDomainTypePreviewItem,
    ExpressionDomainTypeScaffoldDefinition,
    ExpressionDomainTypeScaffoldPreviewRequest,
    ExpressionDomainTypeScaffoldPreviewResponse,
)
from services.expression_domain_type_scaffold_names import (
    build_expression_domain_type_scaffold_names,
)
from services.scaffold_existence import get_expression_domain_type_existence
from services.scaffold_validation import validate_rendered_scaffold_files
from services.template_renderer import render_template_strict


EXPRESSION_DOMAIN_TYPE_TEMPLATES_DIR = (
    Path(__file__).resolve().parent.parent / "templates" / "expression-domain-type"
)


def _load_template(template_filename: str) -> str:
    return (EXPRESSION_DOMAIN_TYPE_TEMPLATES_DIR / template_filename).read_text(
        encoding="utf-8"
    )


def _json_dump(value) -> str:
    return json.dumps(value, indent=2, ensure_ascii=True)


_JS_IDENTIFIER_RE = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$]*$")


def _format_js_key(key: str) -> str:
    if _JS_IDENTIFIER_RE.fullmatch(key):
        return key
    return json.dumps(key, ensure_ascii=True)


def _js_literal_dump(value, indent: int = 0) -> str:
    indent_prefix = " " * indent
    next_indent = indent + 2
    next_indent_prefix = " " * next_indent

    if isinstance(value, dict):
        if not value:
            return "{}"

        lines = ["{"]
        for key, nested_value in value.items():
            rendered_value = _js_literal_dump(nested_value, next_indent)
            lines.append(
                f"{next_indent_prefix}{_format_js_key(str(key))}: {rendered_value},"
            )
        lines.append(f"{indent_prefix}}}")
        return "\n".join(lines)

    if isinstance(value, list):
        if not value:
            return "[]"

        lines = ["["]
        for item in value:
            rendered_item = _js_literal_dump(item, next_indent)
            lines.append(f"{next_indent_prefix}{rendered_item},")
        lines.append(f"{indent_prefix}]")
        return "\n".join(lines)

    if value is None:
        return "null"

    if value is True:
        return "true"

    if value is False:
        return "false"

    return json.dumps(value, ensure_ascii=True)


def _build_commented_example_block(
    title: str,
    value,
    *,
    include_when_none: bool = False,
) -> str:
    if value is None and not include_when_none:
        return ""

    content = _json_dump(value)
    lines = [f"// {title}"]
    lines.extend(f"// {line}" for line in content.splitlines())
    return "\n".join(lines)


def _build_placeholder_values(
    definition: ExpressionDomainTypeScaffoldDefinition,
) -> dict[str, str]:
    names = build_expression_domain_type_scaffold_names(definition)

    return {
        "type_key": definition.typeKey,
        "label_json": json.dumps(definition.label, ensure_ascii=True),
        "description_json": json.dumps(definition.description, ensure_ascii=True),
        "family_json": json.dumps(definition.family, ensure_ascii=True),
        "constraint_example_json": _js_literal_dump(
            definition.constraintExample, indent=2
        ),
        "definition_example_json": _js_literal_dump(definition.definitionExample),
        "evaluation_example_json": _js_literal_dump(definition.evaluationExample),
        "constraint_example_comment_block": _build_commented_example_block(
            "constraintExample scaffold seed:",
            definition.constraintExample,
            include_when_none=True,
        ),
        "definition_example_comment_block": _build_commented_example_block(
            "definitionExample scaffold seed:",
            definition.definitionExample,
            include_when_none=True,
        ),
        "evaluation_example_comment_block": _build_commented_example_block(
            "evaluationExample scaffold seed:",
            definition.evaluationExample,
            include_when_none=definition.evaluationExample is not None,
        ),
        "creation_form_component_name": names.creation_form_component_name,
        "evaluation_input_component_name": names.evaluation_input_component_name,
        "backend_export_name": names.backend_export_name,
        "frontend_export_name": names.frontend_export_name,
    }


def build_expression_domain_type_scaffold_preview(
    request: ExpressionDomainTypeScaffoldPreviewRequest,
    *,
    project_root: Path,
) -> ExpressionDomainTypeScaffoldPreviewResponse:
    definition = request.expressionDomainType
    existence = get_expression_domain_type_existence(project_root, definition.typeKey)

    if existence.status == "exists":
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Expression domain type scaffold already exists in backend and frontend.",
                "typeKey": definition.typeKey,
            },
        )

    if existence.status == "partial":
        backend_status = "exists" if existence.backend_exists else "missing"
        frontend_status = "exists" if existence.frontend_exists else "missing"
        raise HTTPException(
            status_code=409,
            detail={
                "message": (
                    "Expression domain type scaffold exists partially: "
                    f"backend is {backend_status} and frontend is {frontend_status}."
                ),
                "typeKey": definition.typeKey,
            },
        )

    names = build_expression_domain_type_scaffold_names(definition)
    backend_target_base_path = (
        "Backend/modules/decisionPlugins/expressionDomains/types/"
        f"{names.type_key}"
    )
    frontend_target_base_path = (
        "Frontend/src/features/decisionPlugins/expressionDomains/types/"
        f"{names.type_key}"
    )
    placeholders = _build_placeholder_values(definition)

    template_map = [
        ("backend-index.js.template", f"{backend_target_base_path}/index.js"),
        ("frontend-index.js.template", f"{frontend_target_base_path}/index.js"),
        (
            "frontend-creation-form.jsx.template",
            f"{frontend_target_base_path}/{names.creation_form_component_name}.jsx",
        ),
        (
            "frontend-evaluation-input.jsx.template",
            f"{frontend_target_base_path}/{names.evaluation_input_component_name}.jsx",
        ),
    ]

    files = []
    for template_name, output_path in template_map:
        content = render_template_strict(_load_template(template_name), placeholders)
        files.append(ScaffoldedFile(path=output_path, content=content))

    validation = validate_rendered_scaffold_files(files)

    return ExpressionDomainTypeScaffoldPreviewResponse(
        backendTargetBasePath=backend_target_base_path,
        frontendTargetBasePath=frontend_target_base_path,
        items=[
            ExpressionDomainTypePreviewItem(
                key=definition.typeKey,
                targetBasePath=backend_target_base_path,
                files=files,
            )
        ],
        validation=validation,
    )
