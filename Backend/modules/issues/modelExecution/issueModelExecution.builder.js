import { getOrderedAlternativeAndCriterionNames } from "../evaluations/structures/shared/alternativeEvaluation.helpers.js";

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
}) => ({
  message,
  consensusMeasure: result.consensusMeasure,
  collectivePayload: result.collectivePayload,
  computedPayload: {
    ranking: result.ranking,
    rankedWithScores: result.rankedWithScores,
    scoresByAlternative: result.scoresByAlternative,
    matrixUsed: result.matrixUsed,
    plotsGraphic: result.plotsGraphic,
  },
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
});
