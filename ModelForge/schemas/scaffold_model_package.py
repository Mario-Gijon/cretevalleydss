from typing import Literal

from pydantic import BaseModel, Field

from schemas.scaffold_common import ScaffoldedFile
from schemas.scaffold_evaluation_structure import (
    EvaluationStructureScaffoldPreviewRequest,
)
from schemas.scaffold_model import ModelScaffoldPreviewRequest
from schemas.scaffold_parameter import ParameterScaffoldPreviewRequest


class ModelPackagePreviewRequest(BaseModel):
    model: ModelScaffoldPreviewRequest
    evaluationStructure: EvaluationStructureScaffoldPreviewRequest | None = None
    parameterStructures: list[ParameterScaffoldPreviewRequest] = Field(
        default_factory=list
    )


class ModelPackageApplyRequest(ModelPackagePreviewRequest):
    pass


class ModelPackagePreviewItem(BaseModel):
    kind: Literal["model", "parameter", "evaluation-structure"]
    key: str
    status: Literal["toGenerate", "exists", "partial"]
    reason: str | None
    targetBasePath: str | None
    files: list[ScaffoldedFile] = Field(default_factory=list)


class ModelPackagePreviewResponse(BaseModel):
    service: Literal["model-forge"] = "model-forge"
    kind: Literal["model-package"] = "model-package"
    mode: Literal["preview"] = "preview"
    items: list[ModelPackagePreviewItem] = Field(default_factory=list)


class AppliedScaffoldFile(BaseModel):
    path: str


class ModelPackageApplyItem(BaseModel):
    kind: Literal["model", "parameter", "evaluation-structure"]
    key: str
    status: Literal["written", "skipped"]
    reason: str | None
    targetBasePath: str | None
    writtenFiles: list[AppliedScaffoldFile] = Field(default_factory=list)
    skippedFiles: list[AppliedScaffoldFile] = Field(default_factory=list)


class ModelPackageApplyResponse(BaseModel):
    service: Literal["model-forge"] = "model-forge"
    kind: Literal["model-package"] = "model-package"
    mode: Literal["apply"] = "apply"
    items: list[ModelPackageApplyItem] = Field(default_factory=list)
