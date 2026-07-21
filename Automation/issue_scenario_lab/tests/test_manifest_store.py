from __future__ import annotations

from pathlib import Path

import pytest

from issue_scenario_lab.errors import ManifestError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore


def entry(generation_id: str = "abc123") -> GeneratedIssue:
    return GeneratedIssue(
        generationId=generation_id,
        scenarioId="no-consensus-basic",
        issueId="issue-1",
        issueName="[AUTO:abc123] No consensus · basic",
        ownerAlias="owner",
        visibleUserAliases=["owner", "expert_a"],
    )


def test_missing_manifest_is_empty_and_add_reload_remove_is_atomic(tmp_path: Path) -> None:
    path = tmp_path / ".issue-scenario-lab" / "manifest.json"
    store = ManifestStore(path)
    assert store.list_entries() == []
    store.add(entry())
    assert path.exists()
    assert '"generatedIssues": [' in path.read_text(encoding="utf-8")
    assert store.find("abc123") == entry()
    assert store.remove("abc123") == entry()
    assert store.list_entries() == []
    assert not list(path.parent.glob("*.tmp"))


def test_duplicate_generation_id_and_corrupted_json_fail_clearly(tmp_path: Path) -> None:
    path = tmp_path / "manifest.json"
    store = ManifestStore(path)
    store.add(entry())
    with pytest.raises(ManifestError, match="duplicate generationId"):
        store.add(entry())
    path.write_text("{broken", encoding="utf-8")
    with pytest.raises(ManifestError, match="invalid JSON"):
        store.load()


def test_manifest_rejects_invalid_structure(tmp_path: Path) -> None:
    path = tmp_path / "manifest.json"
    path.write_text('{"generatedIssues": [{"generationId": "only-id"}]}', encoding="utf-8")
    with pytest.raises(ManifestError, match="invalid structure"):
        ManifestStore(path).load()
