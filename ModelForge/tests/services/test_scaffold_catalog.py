from pathlib import Path

from services.scaffold_catalog import build_scaffold_catalog


def _write_index(root: Path, relative_path: str, source: str = "") -> None:
    path = root / relative_path / "index.js"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(source, encoding="utf-8")


def _make_structure_directory(root: Path, relative_path: str) -> None:
    (root / relative_path).mkdir(parents=True, exist_ok=True)


def _parameter_item(catalog, key: str):
    return next(item for item in catalog.parameterStructures if item.key == key)


def _evaluation_item(catalog, key: str):
    return next(item for item in catalog.evaluationStructures if item.key == key)


def test_catalog_aggregates_parameter_structure_lifecycle_for_reuse(tmp_path: Path) -> None:
    backend = "Backend/modules/decisionPlugins/modelParameters/structures"
    frontend = "Frontend/src/features/decisionPlugins/modelParameters/fields"

    _write_index(tmp_path, f"{backend}/legacy")
    _write_index(tmp_path, f"{frontend}/legacy")
    _write_index(tmp_path, f"{backend}/explicitReady", 'implementationStatus: "ready"')
    _write_index(tmp_path, f"{frontend}/explicitReady", 'implementationStatus: "ready"')
    _write_index(tmp_path, f"{backend}/scaffold", 'implementationStatus: "scaffold"')
    _write_index(tmp_path, f"{frontend}/scaffold", 'implementationStatus: "scaffold"')
    _write_index(tmp_path, f"{backend}/mixed", 'implementationStatus: "ready"')
    _write_index(tmp_path, f"{frontend}/mixed", 'implementationStatus: "scaffold"')
    _write_index(tmp_path, f"{backend}/invalid", 'implementationStatus: "draft"')
    _write_index(tmp_path, f"{frontend}/invalid", 'implementationStatus: "ready"')
    _write_index(tmp_path, f"{backend}/partial", 'implementationStatus: "ready"')
    _make_structure_directory(tmp_path, f"{backend}/missingBoth")
    _make_structure_directory(tmp_path, f"{frontend}/missingBoth")
    _write_index(tmp_path, f"{backend}/missingFrontend")
    _make_structure_directory(tmp_path, f"{frontend}/missingFrontend")
    _write_index(
        tmp_path,
        f"{backend}/commented",
        '// implementationStatus: "scaffold"\n',
    )
    _write_index(tmp_path, f"{frontend}/commented", "/*\n * implementationStatus: \"scaffold\"\n */\n")

    catalog = build_scaffold_catalog(tmp_path)

    assert _parameter_item(catalog, "legacy").model_dump() == {
        "key": "legacy", "status": "ready", "backendExists": True,
        "frontendExists": True, "implementationStatus": "ready", "available": True,
    }
    assert _parameter_item(catalog, "explicitReady").available is True
    assert _parameter_item(catalog, "scaffold").implementationStatus == "scaffold"
    assert _parameter_item(catalog, "scaffold").available is False
    assert _parameter_item(catalog, "mixed").implementationStatus == "scaffold"
    assert _parameter_item(catalog, "mixed").available is False
    assert _parameter_item(catalog, "invalid").implementationStatus == "invalid"
    assert _parameter_item(catalog, "invalid").available is False
    assert _parameter_item(catalog, "partial").status == "partial"
    assert _parameter_item(catalog, "partial").available is False
    assert _parameter_item(catalog, "missingBoth").implementationStatus == "invalid"
    assert _parameter_item(catalog, "missingBoth").available is False
    assert _parameter_item(catalog, "missingFrontend").implementationStatus == "invalid"
    assert _parameter_item(catalog, "missingFrontend").available is False
    assert _parameter_item(catalog, "commented").implementationStatus == "ready"
    assert _parameter_item(catalog, "commented").available is True


def test_catalog_requires_ready_evaluation_lifecycle_for_stage_availability(
    tmp_path: Path,
) -> None:
    backend = "Backend/modules/decisionPlugins/evaluations/structures"
    frontend = "Frontend/src/features/decisionPlugins/evaluations/structures"
    stage = "stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,\n"

    _write_index(tmp_path, f"{backend}/ready", stage)
    _write_index(tmp_path, f"{frontend}/ready")
    _write_index(tmp_path, f"{backend}/scaffold", stage + 'implementationStatus: "scaffold"')
    _write_index(tmp_path, f"{frontend}/scaffold", 'implementationStatus: "scaffold"')
    _write_index(tmp_path, f"{backend}/invalid", stage + 'implementationStatus: null')
    _write_index(tmp_path, f"{frontend}/invalid")
    _make_structure_directory(tmp_path, f"{backend}/missingIndex")
    _make_structure_directory(tmp_path, f"{frontend}/missingIndex")
    _write_index(
        tmp_path,
        f"{backend}/commented",
        stage + '// implementationStatus: "scaffold"\n',
    )
    _write_index(tmp_path, f"{frontend}/commented")

    catalog = build_scaffold_catalog(tmp_path)

    assert _evaluation_item(catalog, "ready").availableForAlternativeEvaluation is True
    assert _evaluation_item(catalog, "scaffold").implementationStatus == "scaffold"
    assert _evaluation_item(catalog, "scaffold").availableForAlternativeEvaluation is False
    assert _evaluation_item(catalog, "invalid").implementationStatus == "invalid"
    assert _evaluation_item(catalog, "invalid").availableForAlternativeEvaluation is False
    assert _evaluation_item(catalog, "missingIndex").implementationStatus == "invalid"
    assert _evaluation_item(catalog, "missingIndex").availableForAlternativeEvaluation is False
    assert _evaluation_item(catalog, "commented").implementationStatus == "ready"
    assert _evaluation_item(catalog, "commented").availableForAlternativeEvaluation is True
