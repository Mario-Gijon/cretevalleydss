import pytest

from models.ahp_sort_i.definition import (
    _is_isolated_e2e_stack,
    _is_isolated_local_demo_stack,
)
from registry.model_registry import get_model_definition_by_endpoint_path
from services.model_manifest_service import build_model_manifest


def _set_isolated_e2e_environment(monkeypatch):
    monkeypatch.setenv("NODE_ENV", "e2e")
    monkeypatch.setenv("E2E_ISOLATED_STACK", "true")
    monkeypatch.setenv("E2E_MONGO_HOST", "mongo-e2e")
    monkeypatch.setenv("E2E_MONGODB_DB_NAME", "cretevalley_e2e")


def test_ahp_sort_i_is_ready_and_authorized_only_in_the_isolated_e2e_stack(monkeypatch):
    _set_isolated_e2e_environment(monkeypatch)

    definition = get_model_definition_by_endpoint_path("/ahp_sort_i")
    manifest = next(
        entry
        for entry in build_model_manifest()["models"]
        if entry["apiModelKey"] == "ahp_sort_i"
    )

    assert definition is not None
    assert definition.implementation_status == "ready"
    assert definition.issue_execution_authorized is True
    assert definition.supports_consensus is False
    assert definition.supports_consensus_simulation is False
    assert manifest["implementationStatus"] == "ready"
    assert manifest["publicUsable"] is True
    assert manifest["issueExecutionAuthorized"] is True
    assert manifest["supportsConsensus"] is False
    assert manifest["supportsConsensusSimulation"] is False
    group_parameter = next(
        parameter
        for parameter in definition.parameters
        if parameter["key"] == "ahpSortGroup"
    )
    assert group_parameter == {
        "key": "ahpSortGroup",
        "label": "Group classification",
        "parameterStructureKey": "ahpSortGroup",
        "required": False,
        "description": (
            "Choose the group tie-breaking policy when multiple "
            "experts classify an alternative into equally voted categories."
        ),
    }
    assert "default" not in group_parameter
    assert {item["typeKey"] for item in manifest["supportedExpressionDomains"]} == {
        "numericContinuous",
        "numericDiscrete",
    }


def test_ahp_sort_i_stays_scaffold_if_isolation_database_does_not_match(monkeypatch):
    _set_isolated_e2e_environment(monkeypatch)
    monkeypatch.setenv("E2E_MONGODB_DB_NAME", "development")

    definition = get_model_definition_by_endpoint_path("/ahp_sort_i")
    assert definition is not None
    assert definition.implementation_status == "scaffold"
    assert definition.issue_execution_authorized is False


def _set_isolated_local_demo_environment(monkeypatch):
    monkeypatch.setenv("NODE_ENV", "demo")
    monkeypatch.setenv("DEMO_LOCAL_STACK", "true")
    monkeypatch.setenv("DEMO_MONGO_HOST", "mongo-demo")
    monkeypatch.setenv("DEMO_MONGODB_DB_NAME", "cretevalley_demo")


def test_ahp_sort_i_is_authorized_in_explicit_local_demo_stack_only(monkeypatch):
    for key in (
        "NODE_ENV",
        "DEMO_LOCAL_STACK",
        "DEMO_MONGO_HOST",
        "DEMO_MONGODB_DB_NAME",
        "E2E_ISOLATED_STACK",
        "E2E_MONGO_HOST",
        "E2E_MONGODB_DB_NAME",
    ):
        monkeypatch.delenv(key, raising=False)

    _set_isolated_local_demo_environment(monkeypatch)
    definition = get_model_definition_by_endpoint_path("/ahp_sort_i")
    manifest = next(
        entry
        for entry in build_model_manifest()["models"]
        if entry["apiModelKey"] == "ahp_sort_i"
    )

    assert _is_isolated_local_demo_stack() is True
    assert definition is not None
    assert definition.implementation_status == "ready"
    assert definition.issue_execution_authorized is True
    assert definition.supports_consensus is False
    assert definition.supports_consensus_simulation is False
    assert manifest["issueExecutionAuthorized"] is True
    assert manifest["supportsConsensus"] is False
    assert manifest["supportsConsensusSimulation"] is False


@pytest.mark.parametrize(
    ("key", "invalid_value"),
    [
        ("NODE_ENV", "development"),
        ("NODE_ENV", "production"),
        ("DEMO_LOCAL_STACK", "false"),
        ("DEMO_MONGO_HOST", "mongo"),
        ("DEMO_MONGODB_DB_NAME", "cretevalley_develop"),
    ],
)
def test_each_local_demo_guard_is_required(monkeypatch, key, invalid_value):
    _set_isolated_local_demo_environment(monkeypatch)
    monkeypatch.setenv(key, invalid_value)

    assert _is_isolated_local_demo_stack() is False


@pytest.mark.parametrize(
    "missing_key",
    ["NODE_ENV", "DEMO_LOCAL_STACK", "DEMO_MONGO_HOST", "DEMO_MONGODB_DB_NAME"],
)
def test_each_local_demo_guard_must_be_present(monkeypatch, missing_key):
    _set_isolated_local_demo_environment(monkeypatch)
    monkeypatch.delenv(missing_key)

    assert _is_isolated_local_demo_stack() is False


@pytest.mark.parametrize(
    ("key", "invalid_value"),
    [
        ("NODE_ENV", "development"),
        ("E2E_ISOLATED_STACK", "false"),
        ("E2E_MONGO_HOST", "mongo"),
        ("E2E_MONGODB_DB_NAME", "cretevalley_dev"),
    ],
)
def test_each_isolated_stack_guard_is_required(monkeypatch, key, invalid_value):
    _set_isolated_e2e_environment(monkeypatch)
    monkeypatch.setenv(key, invalid_value)

    assert _is_isolated_e2e_stack() is False


@pytest.mark.parametrize(
    "missing_key",
    ["NODE_ENV", "E2E_ISOLATED_STACK", "E2E_MONGO_HOST", "E2E_MONGODB_DB_NAME"],
)
def test_each_isolated_stack_guard_must_be_present(monkeypatch, missing_key):
    _set_isolated_e2e_environment(monkeypatch)
    monkeypatch.delenv(missing_key)

    assert _is_isolated_e2e_stack() is False
