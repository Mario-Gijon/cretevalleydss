import asyncio

import httpx

from api.routers import models as models_router
from core.application import create_application
from registry.model_registry import get_model_definition_by_endpoint_path


def test_scaffold_has_no_explicit_post_route_or_openapi_endpoint():
    model = get_model_definition_by_endpoint_path("/topsis_sort_2016")
    assert model is not None
    assert model.implementation_status == "scaffold"

    explicit_post_paths = {
        route.path
        for route in models_router.router.routes
        if "POST" in getattr(route, "methods", set())
        and route.path != "/{model_path:path}"
    }
    assert "/topsis_sort_2016" not in explicit_post_paths
    openapi_paths = create_application().openapi()["paths"]
    assert "/topsis_sort_2016" not in openapi_paths
    assert "/topsis" in openapi_paths
    assert "/bwm" in openapi_paths


def test_dynamic_http_route_returns_not_found_for_scaffold():
    async def post_scaffold():
        transport = httpx.ASGITransport(app=create_application())
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
            timeout=2.0,
        ) as client:
            return await client.post("/topsis_sort_2016", json={})

    response = asyncio.run(asyncio.wait_for(post_scaffold(), timeout=3.0))

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "MODEL_NOT_FOUND"
