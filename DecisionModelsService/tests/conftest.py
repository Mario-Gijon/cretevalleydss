from pathlib import Path
import sys

import pytest


SERVICE_ROOT = Path(__file__).resolve().parents[1]

if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest


@pytest.fixture
def model_definition_factory():
    def factory(**overrides):
        def default_handler(payload):
            return {
                "success": True,
                "message": "ok",
                "data": {"echo": getattr(payload, "model_dump", lambda: payload)()},
                "error": None,
            }

        data = {
            "api_model_key": "demo_model",
            "api_endpoint_path": "/demo_model",
            "request_model": GenericModelExecutionRequest,
            "handler": default_handler,
            "display_name": "Demo Model",
            "small_description": "Small description",
            "extended_description": "Extended description",
            "evaluation_structure_key": "alternativeCriteriaMatrix",
        }
        data.update(overrides)
        return ModelDefinition(**data)

    return factory
