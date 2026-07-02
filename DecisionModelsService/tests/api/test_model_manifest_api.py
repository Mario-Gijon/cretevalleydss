from fastapi.testclient import TestClient

from api.routers import model_manifest as model_manifest_router
from core.application import create_application


def test_get_models_manifest_returns_success_and_models_list(monkeypatch):
    monkeypatch.setattr(
        model_manifest_router,
        "build_model_manifest",
        lambda: {"models": [{"apiModelKey": "alpha"}]},
    )
    client = TestClient(create_application())

    response = client.get("/models/manifest")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert isinstance(payload["data"]["models"], list)
    assert payload["data"]["models"] == [{"apiModelKey": "alpha"}]
