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
    runFullFrontendBuild: bool = False


class ScaffoldValidationCheck(BaseModel):
    name: str
    status: Literal["passed", "failed", "skipped"]
    command: str | None = None
    cwd: str | None = None
    exitCode: int | None = None
    stdout: str | None = None
    stderr: str | None = None
    details: str | None = None


class ScaffoldValidationResult(BaseModel):
    status: Literal["passed", "failed", "skipped"]
    checks: list[ScaffoldValidationCheck] = Field(default_factory=list)


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
    validation: ScaffoldValidationResult = Field(
        default_factory=lambda: ScaffoldValidationResult(status="skipped")
    )


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
    validation: ScaffoldValidationResult = Field(
        default_factory=lambda: ScaffoldValidationResult(status="skipped")
    )
