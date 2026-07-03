from pathlib import Path

import pytest
from fastapi import HTTPException

from schemas.scaffold_assets import ScaffoldAssetItem
from services import scaffold_assets


def test_delete_scaffold_asset_rejects_locations_outside_project_root(
    monkeypatch,
    tmp_path: Path,
) -> None:
    malicious_asset = ScaffoldAssetItem(
        kind="model",
        key="demo_model",
        locations=["../../outside"],
        missingLocations=[],
        deletable=True,
    )

    monkeypatch.setattr(
        scaffold_assets,
        "_find_asset_by_kind_and_key",
        lambda *args, **kwargs: malicious_asset,
    )

    with pytest.raises(HTTPException) as exc_info:
        scaffold_assets.delete_scaffold_asset(
            project_root=tmp_path,
            kind="model",
            key="demo_model",
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["message"] == "Asset path resolves outside project root."
