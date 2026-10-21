import asyncio

import httpx
from fastapi.testclient import TestClient

from api.routers import models as models_router
from core.application import create_application
from models.topsis_sort_2016.examples import TOPSIS_SORT_2016_REQUEST_EXAMPLES
from registry.model_registry import get_model_definition_by_endpoint_path


def test_ready_model_is_registered_as_a_normal_post_route_and_manifest_entry():
    model = get_model_definition_by_endpoint_path("/topsis_sort_2016")
    assert model is not None
    assert model.implementation_status == "ready"
    assert model.issue_execution_authorized is True

    explicit_post_paths = {
        route.path
        for route in models_router.router.routes
        if "POST" in getattr(route, "methods", set())
        and route.path != "/{model_path:path}"
    }
    assert "/topsis_sort_2016" in explicit_post_paths
    openapi_paths = create_application().openapi()["paths"]
    assert "/topsis_sort_2016" in openapi_paths
    assert "/topsis" in openapi_paths
    assert "/bwm" in openapi_paths


def test_http_route_executes_topsis_sort():
    payload = TOPSIS_SORT_2016_REQUEST_EXAMPLES[
        "numeric_benefit_cost_sorting"
    ]["value"]
    async def post_example():
        transport = httpx.ASGITransport(app=create_application())
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
            timeout=3.0,
        ) as client:
            return await asyncio.wait_for(
                client.post("/topsis_sort_2016", json=payload),
                timeout=5.0,
            )

    response = asyncio.run(post_example())

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert [
        item["categoryId"] for item in response.json()["data"]["categories"]
    ] == ["low", "middle", "high"]
