import asyncio
import json
from pathlib import Path

import httpx

from api.routers.models import execute_dynamic_model
from models.topsis_sort_2016.definition import MODEL_DEFINITION
from registry.model_registry import get_model_definition_by_endpoint_path
from services.model_manifest_service import build_model_manifest


def _enable_isolated_e2e(monkeypatch):
    monkeypatch.setenv("NODE_ENV", "e2e")
    monkeypatch.setenv("E2E_ISOLATED_STACK", "true")
    monkeypatch.setenv("E2E_ENABLE_TOPSIS_SORT_2016", "true")
    monkeypatch.setenv("E2E_MONGO_HOST", "mongo-e2e")
    monkeypatch.setenv("E2E_MONGODB_DB_NAME", "cretevalley_e2e")


def test_checked_in_definition_stays_disabled_without_explicit_isolated_e2e(monkeypatch):
    for key in (
        "NODE_ENV",
        "E2E_ISOLATED_STACK",
        "E2E_ENABLE_TOPSIS_SORT_2016",
        "E2E_MONGO_HOST",
        "E2E_MONGODB_DB_NAME",
    ):
        monkeypatch.delenv(key, raising=False)

    model = get_model_definition_by_endpoint_path("/topsis_sort_2016")
    manifest = next(item for item in build_model_manifest()["models"] if item["apiModelKey"] == "topsis_sort_2016")

    assert MODEL_DEFINITION.implementation_status == "scaffold"
    assert MODEL_DEFINITION.issue_execution_authorized is False
    assert model.implementation_status == "scaffold"
    assert model.issue_execution_authorized is False
    assert manifest["publicUsable"] is False
    assert manifest["issueExecutionAuthorized"] is False


def test_only_exact_isolated_e2e_configuration_exposes_model(monkeypatch):
    _enable_isolated_e2e(monkeypatch)

    model = get_model_definition_by_endpoint_path("/topsis_sort_2016")
    manifest = next(item for item in build_model_manifest()["models"] if item["apiModelKey"] == "topsis_sort_2016")

    assert model.implementation_status == "ready"
    assert model.issue_execution_authorized is True
    assert manifest["publicUsable"] is True
    assert manifest["issueExecutionAuthorized"] is True
    assert MODEL_DEFINITION.implementation_status == "scaffold"
    assert MODEL_DEFINITION.issue_execution_authorized is False


def test_e2e_model_endpoint_executes_only_after_explicit_activation(monkeypatch):
    _enable_isolated_e2e(monkeypatch)
    fixture_path = Path(__file__).parents[3] / "Automation/issue_scenario_lab/data/topsis_sort_2016.json"
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    quality_id, cost_id = "quality", "cost"
    alternative_ids = {item["key"]: item["key"] for item in fixture["alternatives"]}
    payload = {
        "context": {
            "issue": {"id": "e2e-issue", "name": "E2E TOPSIS-Sort", "consensusThreshold": None, "consensusMaxPhases": None},
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
                "expert": {"id": "e2e-expert"},
                "payload": {
                    alternative_ids[key]: {quality_id: values["quality"], cost_id: values["cost"]}
                    for key, values in fixture["evaluations"].items()
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


def test_activation_rejected_when_any_isolation_marker_is_wrong(monkeypatch):
    _enable_isolated_e2e(monkeypatch)
    monkeypatch.setenv("E2E_MONGO_HOST", "mongo-dev")

    model = get_model_definition_by_endpoint_path("/topsis_sort_2016")

    assert model.implementation_status == "scaffold"
    assert model.issue_execution_authorized is False
