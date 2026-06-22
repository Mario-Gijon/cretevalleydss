from pathlib import Path
from pprint import pformat
import json

from schemas.scaffold_model import (
    ModelScaffoldPreviewRequest,
    ModelScaffoldPreviewResponse,
    ScaffoldedFile,
)
from services.model_scaffold_names import build_model_scaffold_names
from services.template_renderer import render_template_strict


MODEL_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "model"


def _format_python_value(value) -> str:
    return pformat(value, width=88, sort_dicts=False)


def _format_python_string_literal(value: str) -> str:
    return json.dumps(value)


def _build_examples_import_block(
    include_examples: bool,
    request_examples_constant: str,
    response_examples_constant: str,
) -> str:
    if not include_examples:
        return ""

    return "\n".join(
        [
            "from .examples import (",
            f"    {request_examples_constant},",
            f"    {response_examples_constant},",
            ")",
        ]
    )


def _build_placeholder_values(request: ModelScaffoldPreviewRequest) -> dict[str, str]:
    names = build_model_scaffold_names(request.apiModelKey)
    include_examples = request.includeExamples is True

    return {
        "api_model_key": names.api_model_key,
        "api_endpoint_path": names.api_endpoint_path,
        "display_name": request.displayName,
        "small_description": request.smallDescription,
        "extended_description": request.extendedDescription,
        "api_model_key_literal": _format_python_string_literal(names.api_model_key),
        "api_endpoint_path_literal": _format_python_string_literal(
            names.api_endpoint_path
        ),
        "display_name_literal": _format_python_string_literal(request.displayName),
        "small_description_literal": _format_python_string_literal(
            request.smallDescription
        ),
        "extended_description_literal": _format_python_string_literal(
            request.extendedDescription
        ),
        "snake_case_model_name": names.snake_case_model_name,
        "execute_function_name": names.execute_function_name,
        "run_function_name": names.run_function_name,
        "request_examples_constant": names.request_examples_constant,
        "response_examples_constant": names.response_examples_constant,
        "model_kind": request.modelKind,
        "model_kind_literal": _format_python_string_literal(request.modelKind),
        "evaluation_structure_key": request.evaluationStructureKey,
        "evaluation_structure_key_literal": _format_python_string_literal(
            request.evaluationStructureKey
        ),
        "supports_consensus": repr(request.supportsConsensus),
        "supports_consensus_simulation": repr(request.supportsConsensusSimulation),
        "is_multi_criteria": repr(request.isMultiCriteria),
        "uses_criteria_weights": repr(request.usesCriteriaWeights),
        "uses_expert_weights": repr(request.usesExpertWeights),
        "uses_fuzzy_criteria_weights": repr(request.usesFuzzyCriteriaWeights),
        "uses_criterion_types": repr(request.usesCriterionTypes),
        "supported_domains": _format_python_value(request.supportedDomains),
        "parameters": _format_python_value(request.parameters),
        "examples_import_block": _build_examples_import_block(
            include_examples,
            names.request_examples_constant,
            names.response_examples_constant,
        ),
        "request_examples_value": (
            names.request_examples_constant if include_examples else "{}"
        ),
        "response_examples_value": (
            names.response_examples_constant if include_examples else "{}"
        ),
    }


def _load_template(template_filename: str) -> str:
    return (MODEL_TEMPLATES_DIR / template_filename).read_text(encoding="utf-8")


def build_model_scaffold_preview(
    request: ModelScaffoldPreviewRequest,
) -> ModelScaffoldPreviewResponse:
    names = build_model_scaffold_names(request.apiModelKey)
    target_base_path = f"DecisionModelsService/models/{names.snake_case_model_name}"
    placeholders = _build_placeholder_values(request)

    template_map = [
        ("definition.py.template", "definition.py"),
        ("executor.py.template", "executor.py"),
        ("run.py.template", "run.py"),
    ]

    if request.includeExamples:
        template_map.append(("examples.py.template", "examples.py"))

    files = []
    for template_name, output_name in template_map:
        content = render_template_strict(_load_template(template_name), placeholders)
        files.append(
            ScaffoldedFile(
                path=f"{target_base_path}/{output_name}",
                content=content,
            )
        )

    return ModelScaffoldPreviewResponse(
        service="model-forge",
        kind="model",
        mode="preview",
        targetBasePath=target_base_path,
        files=files,
    )
