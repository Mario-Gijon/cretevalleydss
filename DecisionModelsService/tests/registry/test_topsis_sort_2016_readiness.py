import asyncio
import json
from pathlib import Path

from api.routers.models import execute_dynamic_model
from models.topsis_sort_2016.definition import MODEL_DEFINITION
from registry.model_registry import get_model_definition_by_endpoint_path
from services.model_manifest_service import build_model_manifest


def test_topsis_sort_is_ready_and_authorized_without_runtime_overrides(monkeypatch):
    for key in (
        "NODE_ENV",
        "E2E_ISOLATED_STACK",
        "E2E_ENABLE_TOPSIS_SORT_2016",
        "E2E_MONGO_HOST",
        "E2E_MONGODB_DB_NAME",
    ):
        monkeypatch.delenv(key, raising=False)

    model = get_model_definition_by_endpoint_path("/topsis_sort_2016")
    manifest = next(
        item
        for item in build_model_manifest()["models"]
        if item["apiModelKey"] == "topsis_sort_2016"
    )

    assert MODEL_DEFINITION.implementation_status == "ready"
    assert MODEL_DEFINITION.issue_execution_authorized is True
    assert model.implementation_status == "ready"
    assert model.issue_execution_authorized is True
    assert manifest["publicUsable"] is True
    assert manifest["issueExecutionAuthorized"] is True


def test_dynamic_endpoint_executes_topsis_sort_without_e2e_activation(monkeypatch):
    for key in (
        "NODE_ENV",
        "E2E_ISOLATED_STACK",
        "E2E_ENABLE_TOPSIS_SORT_2016",
        "E2E_MONGO_HOST",
        "E2E_MONGODB_DB_NAME",
    ):
        monkeypatch.delenv(key, raising=False)

    fixture_path = Path(__file__).parents[3] / "Automation/issue_scenario_lab/data/topsis_sort_2016.json"
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    quality_id, cost_id = "quality", "cost"
    payload = {
        "context": {
            "issue": {"id": "test-issue", "name": "TOPSIS-Sort", "consensusThreshold": None, "consensusMaxPhases": None},
            "alternatives": [{"id": item["key"], "name": item["name"]} for item in fixture["alternatives"]],
            "criteria": [
                {"id": quality_id, "name": "Quality", "type": "benefit", "expressionDomain": {"typeKey": "numericDiscrete", "definition": {"min": 0, "max": 10, "step": 1}}},
                {"id": cost_id, "name": "Cost", "type": "cost", "expressionDomain": {"typeKey": "numericDiscrete", "definition": {"min": 0, "max": 10, "step": 1}}},
            ],
            "consensusPhase": 0,
            "previousStageResult": None,
            "structure": {"key": "alternativeCriteriaMatrix", "stage": "alternativeEvaluation"},
        },
        "modelParameters": {
            "weights": {quality_id: 0.6, cost_id: 0.4},
            "orderedCategories": fixture["orderedCategories"],
            "boundaryProfiles": fixture["boundaryProfiles"],
        },
        "evaluations": [
            {
                "expert": {"id": "test-expert"},
                "payload": {
                    item["key"]: {
                        quality_id: fixture["evaluations"][item["key"]]["quality"],
                        cost_id: fixture["evaluations"][item["key"]]["cost"],
                    }
                    for item in fixture["alternatives"]
                },
            }
        ],
    }

    response = asyncio.run(execute_dynamic_model("topsis_sort_2016", payload))

    assert response["success"] is True
    assert response["data"]["categories"] == fixture["orderedCategories"]
    assert response["data"]["assignments"] == [
        {"alternativeId": key, "categoryId": category}
        for key, category in fixture["expectedAssignments"].items()
    ]
