import { createBadRequestError, createInternalError } from "../../../../../utils/common/errors.js";
import { getEvaluationStructureOrThrow } from "../../../../decisionPlugins/evaluations/evaluationStructureRegistry.js";

const STAGES = new Set(["criteriaWeighting", "alternativeEvaluation"]);

export const isFinishedIssue = (issue) =>
  issue?.currentStage === "finished" && issue?.active === false;

export const validateFinishedIssueOrThrow = ({ issue }) => {
  if (!isFinishedIssue(issue)) {
    throw createBadRequestError(
      "Finished payload is only supported for finished inactive issues",
      { field: "currentStage" }
    );
  }

  getEvaluationStructureOrThrow(issue.evaluationStructureKey);
};

export const validateFinishedEvidenceOrThrow = ({
  criteria,
  expressionDomains,
  evaluations,
  participations,
  phaseResults,
}) => {
  const domainIds = new Set(expressionDomains.map((domain) => String(domain._id)));
  const criterionIds = new Set(criteria.map((criterion) => String(criterion._id)));
  const resultIds = new Set(phaseResults.map((result) => String(result._id)));
  const participantExpertIds = new Set(
    participations.map((participation) => String(participation.expert?._id || participation.expert))
  );

  for (const criterion of criteria) {
    if (criterion.expressionDomain && !domainIds.has(String(criterion.expressionDomain))) {
      throw createInternalError("Finished criterion references a missing expression domain", {
        field: "criteria.expressionDomain",
        details: { criterionId: String(criterion._id) },
      });
    }
    if (criterion.parentCriterion && !criterionIds.has(String(criterion.parentCriterion))) {
      throw createInternalError("Finished criterion references a missing parent", {
        field: "criteria.parentCriterion",
        details: { criterionId: String(criterion._id) },
      });
    }
  }

  for (const evaluation of evaluations) {
    if (
      !STAGES.has(evaluation.stage) ||
      !Number.isInteger(evaluation.consensusPhase) ||
      evaluation.consensusPhase < 0 ||
      !evaluation.expert
    ) {
      throw createInternalError("Finished evaluation has invalid stage or phase", {
        field: "evaluations",
        details: { evaluationId: String(evaluation._id) },
      });
    }
  }

  for (const result of phaseResults) {
    if (
      !STAGES.has(result.stage) ||
      !Number.isInteger(result.consensusPhase) ||
      result.consensusPhase < 0
    ) {
      throw createInternalError("Finished phase result has invalid stage or phase", {
        field: "phaseResults",
        details: { phaseResultId: String(result._id) },
      });
    }
    if (!resultIds.has(String(result._id))) {
      throw createInternalError("Finished phase result id is invalid", {
        field: "phaseResults._id",
      });
    }
    for (const snapshot of result.inputSnapshot?.expertWeights || []) {
      const expertId = String(snapshot.expert?._id || snapshot.expert || "");
      if (!expertId || !participantExpertIds.has(expertId)) {
        throw createInternalError("Finished phase result references an unknown participant expert", {
          field: "phaseResults.inputSnapshot.expertWeights",
          details: { phaseResultId: String(result._id), expertId: expertId || null },
        });
      }
    }
  }
};
