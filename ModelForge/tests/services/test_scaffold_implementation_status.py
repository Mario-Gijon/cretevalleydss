from pathlib import Path

from schemas.scaffold_evaluation_structure import (
    EvaluationStructureScaffoldPreviewRequest,
)
from schemas.scaffold_model import ModelScaffoldPreviewRequest
from schemas.scaffold_model_package import ModelPackagePreviewRequest
from schemas.scaffold_parameter import ParameterScaffoldPreviewRequest
from services.evaluation_structure_scaffold_preview import (
    build_evaluation_structure_scaffold_preview,
)
from services.parameter_scaffold_preview import build_parameter_scaffold_preview
from services.model_package_preview import build_model_package_preview
from services.model_scaffold_preview import build_model_scaffold_preview


def _file_content(preview, suffix: str) -> str:
    return next(file.content for file in preview.files if file.path.endswith(suffix))


def _file_paths(preview) -> set[str]:
    return {file.path for file in preview.files}


def _model_request() -> ModelScaffoldPreviewRequest:
    return ModelScaffoldPreviewRequest(
        apiModelKey="guide_model",
        displayName="Guide Model",
        smallDescription="Guide scaffold",
        extendedDescription="Guide scaffold preview",
        modelKind="issue",
        evaluationStructureKey="guideEvaluation",
    )


def test_scaffold_previews_include_implementation_guides() -> None:
    model_preview = build_model_scaffold_preview(_model_request())
    evaluation_preview = build_evaluation_structure_scaffold_preview(
        EvaluationStructureScaffoldPreviewRequest(
            evaluationStructureKey="guideEvaluation",
        )
    )
    generic_parameter_preview = build_parameter_scaffold_preview(
        ParameterScaffoldPreviewRequest(parameterStructureKey="guideParameter")
    )

    assert _file_paths(model_preview) == {
        "DecisionModelsService/models/guide_model/__init__.py",
        "DecisionModelsService/models/guide_model/definition.py",
        "DecisionModelsService/models/guide_model/executor.py",
        "DecisionModelsService/models/guide_model/run.py",
        "DecisionModelsService/models/guide_model/examples.py",
        "DecisionModelsService/models/guide_model/IMPLEMENTATION_GUIDE.md",
    }
    assert _file_paths(evaluation_preview) == {
        "Backend/modules/decisionPlugins/evaluations/structures/guideEvaluation/index.js",
        "Backend/modules/decisionPlugins/evaluations/structures/guideEvaluation/guideEvaluation.get.js",
        "Backend/modules/decisionPlugins/evaluations/structures/guideEvaluation/guideEvaluation.save.js",
        "Backend/modules/decisionPlugins/evaluations/structures/guideEvaluation/IMPLEMENTATION_GUIDE.md",
        "Backend/modules/decisionPlugins/evaluations/structures/guideEvaluation/PROMPT_LLM.md",
        "Backend/modules/decisionPlugins/evaluations/structures/guideEvaluation/PROMPT_AGENT.md",
        "Frontend/src/features/decisionPlugins/evaluations/structures/guideEvaluation/index.js",
        "Frontend/src/features/decisionPlugins/evaluations/structures/guideEvaluation/GuideEvaluationView.jsx",
        "Frontend/src/features/decisionPlugins/evaluations/structures/guideEvaluation/IMPLEMENTATION_GUIDE.md",
        "Frontend/src/features/decisionPlugins/evaluations/structures/guideEvaluation/PROMPT_LLM.md",
        "Frontend/src/features/decisionPlugins/evaluations/structures/guideEvaluation/PROMPT_AGENT.md",
    }
    assert all(
        file.content.strip()
        for file in evaluation_preview.files
        if file.path.endswith(("IMPLEMENTATION_GUIDE.md", "PROMPT_LLM.md", "PROMPT_AGENT.md"))
    )
    for preview, backend_path, frontend_path in (
        (
            generic_parameter_preview,
            "Backend/modules/decisionPlugins/modelParameters/structures/guideParameter/IMPLEMENTATION_GUIDE.md",
            "Frontend/src/features/decisionPlugins/modelParameters/fields/guideParameter/IMPLEMENTATION_GUIDE.md",
        ),
    ):
        assert {backend_path, frontend_path} <= _file_paths(preview)


def test_evaluation_prompt_embeds_rendered_runtime_sources_and_stage_value() -> None:
    preview = build_evaluation_structure_scaffold_preview(
        EvaluationStructureScaffoldPreviewRequest(
            evaluationStructureKey="promptEvaluation",
            stageConstant="ALTERNATIVE_EVALUATION",
        )
    )
    files = {file.path: file.content for file in preview.files}
    backend_base = "Backend/modules/decisionPlugins/evaluations/structures/promptEvaluation/"
    frontend_base = "Frontend/src/features/decisionPlugins/evaluations/structures/promptEvaluation/"

    assert "alternativeEvaluation" in files[backend_base + "PROMPT_LLM.md"]
    assert "scaffold_creator_api_operations = false" in files[backend_base + "PROMPT_LLM.md"]
    assert files[backend_base + "index.js"] in files[backend_base + "PROMPT_LLM.md"]
    assert files[backend_base + "promptEvaluation.get.js"] in files[backend_base + "PROMPT_LLM.md"]
    assert files[backend_base + "promptEvaluation.save.js"] in files[backend_base + "PROMPT_LLM.md"]
    assert files[frontend_base + "index.js"] in files[frontend_base + "PROMPT_LLM.md"]
    assert files[frontend_base + "PromptEvaluationView.jsx"] in files[frontend_base + "PROMPT_LLM.md"]
    assert "loading" not in files[frontend_base + "PromptEvaluationView.jsx"]


def test_creator_evaluation_prompt_embeds_optional_runtime_sources() -> None:
    model = _model_request().model_copy(
        update={
            "apiModelKey": "creator_weighting",
            "modelKind": "criteriaWeighting",
            "supportsCreatorCriteriaWeighting": True,
        }
    )
    request = EvaluationStructureScaffoldPreviewRequest(
        evaluationStructureKey="creatorEvaluation",
        stageConstant="CRITERIA_WEIGHTING",
    )
    preview = build_evaluation_structure_scaffold_preview(request, model=model)
    files = {file.path: file.content for file in preview.files}
    backend_base = "Backend/modules/decisionPlugins/evaluations/structures/creatorEvaluation/"
    frontend_base = "Frontend/src/features/decisionPlugins/evaluations/structures/creatorEvaluation/"
    backend_prompt = files[backend_base + "PROMPT_LLM.md"]
    frontend_prompt = files[frontend_base + "PROMPT_LLM.md"]

    assert "criteriaWeighting" in backend_prompt
    assert "scaffold_creator_api_operations = true" in backend_prompt
    assert files[backend_base + "operations/remapCriterionIds.js"] in backend_prompt
    assert files[frontend_base + "operations/buildInitialEvaluation.js"] in frontend_prompt


def test_model_package_preview_includes_guides_only_for_generated_items(
    tmp_path: Path,
) -> None:
    parameter_request = ParameterScaffoldPreviewRequest(
        parameterStructureKey="guideParameter"
    )
    request = ModelPackagePreviewRequest(
        model=_model_request(),
        parameterStructures=[parameter_request],
    )

    preview = build_model_package_preview(request, project_root=tmp_path)
    generated_items = {(item.kind, item.key): item for item in preview.items}
    assert any(
        file.path.endswith("DecisionModelsService/models/guide_model/IMPLEMENTATION_GUIDE.md")
        for file in generated_items[("model", "guide_model")].files
    )
    assert sum(
        file.path.endswith("IMPLEMENTATION_GUIDE.md")
        for file in generated_items[("evaluation-structure", "guideEvaluation")].files
    ) == 2
    assert sum(
        file.path.endswith("IMPLEMENTATION_GUIDE.md")
        for file in generated_items[("parameter", "guideParameter")].files
    ) == 2

    (tmp_path / "Backend/modules/decisionPlugins/modelParameters/structures/guideParameter").mkdir(
        parents=True
    )
    (tmp_path / "Frontend/src/features/decisionPlugins/modelParameters/fields/guideParameter").mkdir(
        parents=True
    )
    existing_preview = build_model_package_preview(request, project_root=tmp_path)
    existing_parameter = next(
        item
        for item in existing_preview.items
        if item.kind == "parameter" and item.key == "guideParameter"
    )
    assert existing_parameter.status == "exists"
    assert existing_parameter.files == []


def test_evaluation_structure_preview_marks_both_runtime_entries_as_scaffolds() -> None:
    preview = build_evaluation_structure_scaffold_preview(
        EvaluationStructureScaffoldPreviewRequest(
            evaluationStructureKey="sampleStructure",
        )
    )

    assert 'implementationStatus: "scaffold"' in _file_content(preview, "/index.js")
    assert sum(
        'implementationStatus: "scaffold"' in file.content
        for file in preview.files
        if file.path.endswith("/index.js")
    ) == 2


def test_parameter_preview_embeds_rendered_runtime_sources() -> None:
    preview = build_parameter_scaffold_preview(
        ParameterScaffoldPreviewRequest(parameterStructureKey="sampleParameter")
    )
    files = {file.path: file.content for file in preview.files}
    backend = "Backend/modules/decisionPlugins/modelParameters/structures/sampleParameter/"
    frontend = "Frontend/src/features/decisionPlugins/modelParameters/fields/sampleParameter/"

    assert len(files) == 11
    assert all(
        files[path].strip()
        for path in files
        if path.endswith(("IMPLEMENTATION_GUIDE.md", "PROMPT_LLM.md", "PROMPT_AGENT.md"))
    )
    backend_prompt = files[backend + "PROMPT_LLM.md"]
    frontend_prompt = files[frontend + "PROMPT_LLM.md"]
    assert files[backend + "index.js"] in backend_prompt
    assert files[backend + "validate.js"] in backend_prompt
    assert files[frontend + "index.js"] in frontend_prompt
    assert files[frontend + "SampleParameterParameterField.jsx"] in frontend_prompt
    assert files[frontend + "SampleParameterParameterReadOnly.jsx"] in frontend_prompt
    assert 'implementationStatus: "scaffold"' in files[backend + "index.js"]
    assert 'implementationStatus: "scaffold"' in files[frontend + "index.js"]
    assert all(
        contract in files[backend + "validate.js"]
        for contract in ("value", "parameter", "context")
    )
    assert "parameterContext" not in files[backend + "validate.js"]
    assert all(
        contract in files[frontend + "SampleParameterParameterField.jsx"]
        for contract in ("parameter", "value", "onChange", "error", "disabled", "parameterContext")
    )
    assert all(
        contract in files[frontend + "SampleParameterParameterReadOnly.jsx"]
        for contract in ("parameter", "value", "parameterContext")
    )
