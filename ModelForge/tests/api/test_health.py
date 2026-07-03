from pathlib import Path


def test_health_endpoint_returns_stable_contract(
    client_factory,
    project_root: Path,
) -> None:
    with client_factory(project_root) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "ModelForge is healthy",
        "data": {
            "service": "ModelForge",
            "status": "healthy",
        },
        "error": None,
    }
