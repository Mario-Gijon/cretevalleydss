from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from schemas.common import ApiError


class OpenModel(BaseModel):
    model_config = ConfigDict(extra="allow")


class AnalysisIssue(OpenModel):
    id: str | None = None
    name: str | None = None
    description: str | None = None
    createdAt: str | None = None
    closedAt: str | None = None
    isConsensus: bool | None = None
    consensusPhase: int | None = None
    consensusThreshold: float | None = None
    consensusMaxPhases: int | None = None


class AnalysisApiEndpoint(OpenModel):
    method: str | None = None
    path: str | None = None


class AnalysisModel(OpenModel):
    issueModelId: str | None = None
    apiModelKey: str | None = None
    apiEndpoint: AnalysisApiEndpoint | None = None
    evaluationStructure: str | None = None
    inputKind: str | None = None
    outputKind: str | None = None
    lifecycleKind: str | None = None
    modelFamilyKey: str | None = None
    modelVersion: str | None = None
    versionLabel: str | None = None
    modelParameters: dict[str, Any] | None = None


class AnalysisAlternative(OpenModel):
    id: str | None = None
    name: str
    description: str | None = None


class AnalysisLeafCriterion(OpenModel):
    id: str | None = None
    name: str
    type: str | None = None
    weight: float | None = None


class AnalysisProblem(OpenModel):
    alternatives: list[AnalysisAlternative] = Field(default_factory=list)
    criteriaTree: list[dict[str, Any]] = Field(default_factory=list)
    leafCriteria: list[AnalysisLeafCriterion] = Field(default_factory=list)
    weights: list[float] = Field(default_factory=list)


class AnalysisExpert(OpenModel):
    id: str | None = None
    email: str | None = None
    name: str | None = None


class AnalysisEvaluations(OpenModel):
    phaseUsed: int | None = None
    rawByExpert: dict[str, Any] = Field(default_factory=dict)
    canonicalByExpert: dict[str, Any] = Field(default_factory=dict)
    localizedByExpert: dict[str, Any] = Field(default_factory=dict)
    expressionDomainsByCell: dict[str, Any] = Field(default_factory=dict)


class AnalysisResult(OpenModel):
    ranking: list[Any] = Field(default_factory=list)
    rankedWithScores: list[dict[str, Any]] = Field(default_factory=list)
    scoresByAlternative: dict[str, float] = Field(default_factory=dict)
    collectiveEvaluations: dict[str, Any] = Field(default_factory=dict)
    collectiveEvaluationsLocalized: dict[str, Any] = Field(default_factory=dict)
    collectiveEvaluationsLocalizedByExpert: dict[str, Any] = Field(default_factory=dict)
    rawOutput: dict[str, Any] = Field(default_factory=dict)
    modelExecution: dict[str, Any] = Field(default_factory=dict)


class AnalysisConsensus(OpenModel):
    history: list[dict[str, Any]] = Field(default_factory=list)
    latest: dict[str, Any] = Field(default_factory=dict)
    phaseSource: str | None = None


class AnalysisContext(OpenModel):
    contextVersion: str = "1.0"
    issue: AnalysisIssue | None = None
    model: AnalysisModel | None = None
    problem: AnalysisProblem | None = None
    experts: list[AnalysisExpert] = Field(default_factory=list)
    evaluations: AnalysisEvaluations | None = None
    result: AnalysisResult | None = None
    consensus: AnalysisConsensus | None = None
    scenarios: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[dict[str, Any]] = Field(default_factory=list)


class AnalysisSectionGeneral(OpenModel):
    key: str
    title: str
    text: str


class AnalysisSectionTechnical(OpenModel):
    key: str
    title: str
    text: str
    tables: list[dict[str, Any]] = Field(default_factory=list)


class ResultsAnalysisSummary(OpenModel):
    recommendation: str | None = None
    explanation: str


class ResultsAnalysisConfidence(OpenModel):
    level: Literal["high", "medium", "low", "unknown"] = "unknown"
    scoreGap: float | None = None
    isCloseDecision: bool = False
    reason: str | None = None


class ResultsAnalysisSections(OpenModel):
    general: list[AnalysisSectionGeneral] = Field(default_factory=list)
    technical: list[AnalysisSectionTechnical] = Field(default_factory=list)


class ResultsAnalysisInsight(OpenModel):
    code: str
    importance: Literal["high", "medium", "low"] = "medium"
    message: str
    evidenceRefs: list[str] = Field(default_factory=list)


class ResultsAnalysisWarning(OpenModel):
    code: str
    severity: Literal["high", "medium", "low"] = "medium"
    message: str


class ResultsAnalysisMetrics(OpenModel):
    rankingStrength: dict[str, Any] = Field(default_factory=dict)
    criterionInfluence: dict[str, Any] = Field(default_factory=dict)
    agreement: dict[str, Any] = Field(default_factory=dict)
    dataCompleteness: dict[str, Any] = Field(default_factory=dict)


class ResultsAnalysisEvidence(OpenModel):
    usedFields: list[str] = Field(default_factory=list)
    missingFields: list[str] = Field(default_factory=list)


class ResultsAnalysis(OpenModel):
    summary: ResultsAnalysisSummary
    confidence: ResultsAnalysisConfidence
    sections: ResultsAnalysisSections
    insights: list[ResultsAnalysisInsight] = Field(default_factory=list)
    warnings: list[ResultsAnalysisWarning] = Field(default_factory=list)
    metrics: ResultsAnalysisMetrics
    evidence: ResultsAnalysisEvidence


class ResultsAnalysisResponse(BaseModel):
    success: bool
    message: str
    data: ResultsAnalysis | None = None
    error: ApiError | None = None
