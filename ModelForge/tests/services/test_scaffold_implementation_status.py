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
    dedicated_parameter_preview = build_parameter_scaffold_preview(
        ParameterScaffoldPreviewRequest(parameterStructureKey="numberGlobal")
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
        "Frontend/src/features/decisionPlugins/evaluations/structures/guideEvaluation/index.js",
        "Frontend/src/features/decisionPlugins/evaluations/structures/guideEvaluation/GuideEvaluationView.jsx",
        "Frontend/src/features/decisionPlugins/evaluations/structures/guideEvaluation/IMPLEMENTATION_GUIDE.md",
    }
    for preview, backend_path, frontend_path in (
        (
            generic_parameter_preview,
            "Backend/modules/decisionPlugins/modelParameters/structures/guideParameter/IMPLEMENTATION_GUIDE.md",
            "Frontend/src/features/decisionPlugins/modelParameters/fields/guideParameter/IMPLEMENTATION_GUIDE.md",
        ),
        (
            dedicated_parameter_preview,
            "Backend/modules/decisionPlugins/modelParameters/structures/numberGlobal/IMPLEMENTATION_GUIDE.md",
            "Frontend/src/features/decisionPlugins/modelParameters/fields/numberGlobal/IMPLEMENTATION_GUIDE.md",
        ),
    ):
        assert {backend_path, frontend_path} <= _file_paths(preview)


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


def test_parameter_structure_previews_mark_generic_and_dedicated_entries_as_scaffolds() -> None:
    generic_preview = build_parameter_scaffold_preview(
        ParameterScaffoldPreviewRequest(parameterStructureKey="sampleParameter")
    )
    dedicated_preview = build_parameter_scaffold_preview(
        ParameterScaffoldPreviewRequest(parameterStructureKey="numberGlobal")
    )

    assert sum(
        'implementationStatus: "scaffold"' in file.content
        for file in generic_preview.files
        if file.path.endswith("/index.js")
    ) == 2
    assert sum(
        'implementationStatus: "scaffold"' in file.content
        for file in dedicated_preview.files
        if file.path.endswith("/index.js")
    ) == 2


def test_dedicated_parameter_scaffold_index_templates_mark_ownership_and_status() -> None:
    dedicated_keys = (
        "intervalGlobal",
        "numberCriterion",
        "numberGlobal",
        "selectCriterion",
        "selectGlobal",
    )

    for parameter_structure_key in dedicated_keys:
        preview = build_parameter_scaffold_preview(
            ParameterScaffoldPreviewRequest(
                parameterStructureKey=parameter_structure_key
            )
        )
        index_files = [
            file
            for file in preview.files
            if file.path.endswith("/index.js")
        ]

        assert index_files
        for file in index_files:
            assert "Generated by ModelForge." in file.content
            assert 'implementationStatus: "scaffold"' in file.content
