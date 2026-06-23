from typing import Literal

from pydantic import BaseModel, Field


ScaffoldAssetKind = Literal["model", "evaluationStructure", "parameterStructure"]


class ScaffoldAssetItem(BaseModel):
    kind: ScaffoldAssetKind
    key: str
    locations: list[str] = Field(default_factory=list)
    missingLocations: list[str] = Field(default_factory=list)
    stage: str | None = None
    deletable: bool = True


class ScaffoldAssetsResponse(BaseModel):
    service: Literal["model-forge"] = "model-forge"
    kind: Literal["scaffold-assets"] = "scaffold-assets"
    models: list[ScaffoldAssetItem] = Field(default_factory=list)
    evaluationStructures: list[ScaffoldAssetItem] = Field(default_factory=list)
    parameterStructures: list[ScaffoldAssetItem] = Field(default_factory=list)


class DeleteScaffoldAssetResponse(BaseModel):
    service: Literal["model-forge"] = "model-forge"
    kind: Literal["scaffold-asset-delete"] = "scaffold-asset-delete"
    assetKind: ScaffoldAssetKind
    key: str
    deletedLocations: list[str] = Field(default_factory=list)
    missingLocations: list[str] = Field(default_factory=list)
