from pathlib import Path


def test_scaffold_catalog_lists_ready_and_partial_assets(
    client_factory,
    project_root: Path,
) -> None:
    parameter_backend = (
        project_root
        / "Backend/modules/decisionPlugins/modelParameters/structures/scoreRange"
    )
    parameter_frontend = (
        project_root
        / "Frontend/src/features/decisionPlugins/modelParameters/fields/scoreRange"
    )
    evaluation_backend = (
        project_root
        / "Backend/modules/decisionPlugins/evaluations/structures/benefitMatrix"
    )
    evaluation_frontend = (
        project_root
        / "Frontend/src/features/decisionPlugins/evaluations/structures/benefitMatrix"
    )
    partial_backend = (
        project_root
        / "Backend/modules/decisionPlugins/evaluations/structures/criteriaOnly"
    )

    parameter_backend.mkdir(parents=True)
    parameter_frontend.mkdir(parents=True)
    evaluation_backend.mkdir(parents=True)
    evaluation_frontend.mkdir(parents=True)
    partial_backend.mkdir(parents=True)

    (evaluation_backend / "index.js").write_text(
        "stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,\n"
        "implementationStatus: 'ready'\n",
        encoding="utf-8",
    )
    (partial_backend / "index.js").write_text(
        "stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,\n"
        "implementationStatus: 'scaffold'\n",
        encoding="utf-8",
    )

    with client_factory(project_root) as client:
        response = client.get("/scaffold/catalog")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "model-forge"
    assert payload["kind"] == "scaffold-catalog"

    parameter_item = next(
        item for item in payload["parameterStructures"] if item["key"] == "scoreRange"
    )
    assert parameter_item == {
        "key": "scoreRange",
        "status": "ready",
        "backendExists": True,
        "frontendExists": True,
        "implementationStatus": "ready",
        "available": True,
    }

    ready_evaluation = next(
        item for item in payload["evaluationStructures"] if item["key"] == "benefitMatrix"
    )
    assert ready_evaluation["stage"] == "alternativeEvaluation"
    assert ready_evaluation["stageConstant"] == "ALTERNATIVE_EVALUATION"
    assert ready_evaluation["status"] == "ready"
    assert ready_evaluation["availableForAlternativeEvaluation"] is True
    assert ready_evaluation["availableForCriteriaWeighting"] is False

    partial_evaluation = next(
        item for item in payload["evaluationStructures"] if item["key"] == "criteriaOnly"
    )
    assert partial_evaluation["status"] == "partial"
    assert partial_evaluation["backendExists"] is True
    assert partial_evaluation["frontendExists"] is False
    assert partial_evaluation["implementationStatus"] == "scaffold"
    assert partial_evaluation["availableForAlternativeEvaluation"] is False
    assert partial_evaluation["availableForCriteriaWeighting"] is False
