from fastapi.testclient import TestClient

from core.application import create_application


def test_health_endpoint_returns_stable_healthy_response():
    client = TestClient(create_application())

    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["message"] == "DecisionModelsService is healthy"
    assert payload["data"]["service"] == "DecisionModelsService"
    assert payload["data"]["status"] == "healthy"
    assert isinstance(payload["data"]["modelsCount"], int)
    assert isinstance(payload["data"]["startedAt"], str)
    assert payload["error"] is None
