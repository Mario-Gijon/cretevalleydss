from fastapi.testclient import TestClient
from pydantic import BaseModel

from api.routers import models as models_router
from api.routers import system as system_router
from core.application import create_application
from registry.model_definition import ModelDefinition


class FakeRequest(BaseModel):
    answer: int


def _build_fake_definition(handler) -> ModelDefinition:
    return ModelDefinition(
        api_model_key="fake_model",
        api_endpoint_path="/fake/model/path",
        request_model=FakeRequest,
        handler=handler,
        display_name="Fake Model",
        small_description="Small",
        extended_description="Extended",
        evaluation_structure_key="alternativeCriteriaMatrix",
    )


def test_unknown_model_path_returns_stable_not_found_contract():
    client = TestClient(create_application())

    response = client.post("/unknown/model/path", json={"anything": True})

    assert response.status_code == 404
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "MODEL_NOT_FOUND"
    assert payload["error"]["field"] == "model_path"
    assert payload["error"]["details"]["endpointPath"] == "/unknown/model/path"


def test_dynamic_model_valid_payload_returns_handler_response(monkeypatch):
    def handler(payload):
        return {
            "success": True,
            "message": "Fake model executed",
            "data": {"answer": payload.answer},
            "error": None,
        }

    monkeypatch.setattr(
        models_router,
        "get_model_definition_by_endpoint_path",
        lambda endpoint_path: _build_fake_definition(handler)
        if endpoint_path == "/fake/model/path"
        else None,
    )
    client = TestClient(create_application())

    response = client.post("/fake/model/path", json={"answer": 7})

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["message"] == "Fake model executed"
    assert body["data"] == {"answer": 7}
    assert body.get("error") is None


def test_dynamic_model_invalid_payload_returns_validation_error(monkeypatch):
    def handler(payload):
        return {
            "success": True,
            "message": "Fake model executed",
            "data": {"answer": payload.answer},
            "error": None,
        }

    monkeypatch.setattr(
        models_router,
        "get_model_definition_by_endpoint_path",
        lambda endpoint_path: _build_fake_definition(handler)
        if endpoint_path == "/fake/model/path"
        else None,
    )
    client = TestClient(create_application())

    response = client.post("/fake/model/path", json={"wrong": 7})

    assert response.status_code == 422
    payload = response.json()
    assert payload["success"] is False
    assert payload["message"] == "Validation error"
    assert payload["data"] is None
    assert payload["error"]["code"] == "VALIDATION_ERROR"
    assert payload["error"]["field"] is None
    assert isinstance(payload["error"]["details"], list)


def test_dynamic_model_async_handler_is_awaited(monkeypatch):
    async def handler(payload):
        return {
            "success": True,
            "message": "Async fake model executed",
            "data": {"answer": payload.answer},
            "error": None,
        }

    monkeypatch.setattr(
        models_router,
        "get_model_definition_by_endpoint_path",
        lambda endpoint_path: _build_fake_definition(handler)
        if endpoint_path == "/fake/model/path"
        else None,
    )
    client = TestClient(create_application())

    response = client.post("/fake/model/path", json={"answer": 11})

    assert response.status_code == 200
    assert response.json()["data"] == {"answer": 11}


def test_system_reload_endpoint_returns_stable_response_when_present(monkeypatch):
    monkeypatch.setattr(system_router, "is_production_environment", lambda: False)
    monkeypatch.setattr(system_router, "_write_reload_marker", lambda: None)
    client = TestClient(create_application())

    response = client.post("/system/reload")

    assert response.status_code == 202
    payload = response.json()
    assert payload["success"] is True
    assert payload["message"] == "DecisionModelsService reload scheduled successfully"
    assert payload["data"] == {
        "service": "DecisionModelsService",
        "reloadScheduled": True,
    }
    assert payload["error"] is None
