import { getOrderedAlternativeAndCriterionNames } from "../evaluations/structures/shared/alternativeEvaluation.helpers.js";
import { createInternalError } from "../../../utils/common/errors.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isFiniteOrNull = (value) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

const validateNormalizedModelResultOrThrow = ({ result }) => {
  if (!isPlainObject(result)) {
    throw createInternalError("Model execution result must be an object", {
      field: "result",
    });
  }

  if (!Array.isArray(result.ranking)) {
    throw createInternalError("Model execution result.ranking is required", {
      field: "result.ranking",
    });
  }

  if (!Array.isArray(result.rankedWithScores)) {
    throw createInternalError("Model execution result.rankedWithScores is required", {
      field: "result.rankedWithScores",
    });
  }

  if (!isPlainObject(result.scoresByAlternative)) {
    throw createInternalError("Model execution result.scoresByAlternative is required", {
      field: "result.scoresByAlternative",
    });
  }

  if (!isPlainObject(result.collectiveEvaluations)) {
    throw createInternalError("Model execution result.collectiveEvaluations is required", {
      field: "result.collectiveEvaluations",
    });
  }

  if (!isPlainObject(result.plotsGraphic)) {
    throw createInternalError("Model execution result.plotsGraphic must be an object", {
      field: "result.plotsGraphic",
    });
  }

  if (!isFiniteOrNull(result.consensusMeasure)) {
    throw createInternalError("Model execution result.consensusMeasure must be finite or null", {
      field: "result.consensusMeasure",
    });
  }

  if (!isPlainObject(result.rawOutput)) {
    throw createInternalError("Model execution result.rawOutput is required", {
      field: "result.rawOutput",
    });
  }
};

export const buildIssueModelRequestPayload = async ({
  issue,
  structureKey,
  evaluations,
  phase,
}) => {
  const { alternatives, criteria } =
    await getOrderedAlternativeAndCriterionNames({ issue });

  return {
    modelParameters: issue.modelParameters,
    evaluations: evaluations.map((evaluation) => ({
      expert: {
        id: String(evaluation.expert._id),
        name: evaluation.expert.name,
        email: evaluation.expert.email,
      },
      payload: evaluation.payload,
    })),
    context: {
      issue: {
        id: String(issue._id),
        name: issue.name,
        consensusThreshold:
          typeof issue?.consensusThreshold === "number" &&
          Number.isFinite(issue.consensusThreshold)
            ? issue.consensusThreshold
            : null,
        consensusMaxPhases:
          Number.isInteger(issue?.consensusMaxPhases) && issue.consensusMaxPhases > 0
            ? issue.consensusMaxPhases
            : null,
      },
      alternatives: alternatives.map((alternative) => ({
        id: String(alternative._id),
        name: alternative.name,
      })),
      criteria: criteria.map((criterion) => ({
        id: String(criterion._id),
        name: criterion.name,
        type: criterion.type,
      })),
      weights: issue.modelParameters.weights ?? [],
      consensusPhase: phase,
      previousStageResult: null,
      structure: {
        key: structureKey,
        stage: "alternativeEvaluation",
      },
    },
  };
};

export const buildIssueModelExecutionResult = ({
  issue,
  message,
  result,
  structureKey,
  issueUpdates,
  nextCurrentStage,
}) => {
  validateNormalizedModelResultOrThrow({ result });

  return {
    message,
    consensusMeasure: result.consensusMeasure,
    ranking: result.ranking,
    rankedWithScores: result.rankedWithScores,
    scoresByAlternative: result.scoresByAlternative,
    collectiveEvaluations: result.collectiveEvaluations,
    plotsGraphic: result.plotsGraphic,
    consensusLifecycle: null,
    modelExecution: {
      kind: "apiModels",
      structureKey,
      apiModelKey: issue.apiModelKey,
      apiEndpointPath: issue.apiEndpoint.path,
      executedAt: new Date(),
    },
    rawOutput: result.rawOutput,
    issueUpdates,
    nextCurrentStage,
  };
};
