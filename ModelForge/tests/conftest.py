from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient


SERVICE_ROOT = Path(__file__).resolve().parents[1]

if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from core.application import create_application


@pytest.fixture
def project_root(tmp_path: Path) -> Path:
    for relative_path in (
        "DecisionModelsService",
        "Backend",
        "Frontend",
        "ModelForge",
    ):
        (tmp_path / relative_path).mkdir(parents=True, exist_ok=True)
    return tmp_path


@pytest.fixture
def client_factory(monkeypatch):
    def factory(project_root: Path) -> TestClient:
        monkeypatch.setenv("PROJECT_ROOT", str(project_root))
        return TestClient(create_application())

    return factory


@pytest.fixture
def valid_model_package_payload() -> dict[str, object]:
    return {
        "model": {
            "apiModelKey": "demo_model",
            "displayName": "Demo Model",
            "smallDescription": "Short demo description",
            "extendedDescription": "Longer demo description for scaffold generation",
            "modelKind": "issue",
            "evaluationStructureKey": "alternativeMatrix",
            "supportedDomains": ["demo"],
            "parameters": [],
            "includeExamples": True,
        },
        "parameterStructures": [],
    }
