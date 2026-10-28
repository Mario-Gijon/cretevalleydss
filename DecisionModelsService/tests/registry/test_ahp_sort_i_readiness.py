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
