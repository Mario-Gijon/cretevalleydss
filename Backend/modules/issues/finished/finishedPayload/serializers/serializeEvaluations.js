import { createInternalError } from "../../../../../utils/common/errors.js";
import { getEvaluationStructureOrThrow } from "../../../../decisionPlugins/evaluations/evaluationStructureRegistry.js";
import { serializeCriterionTreeForContext } from "./serializeCriteria.js";
import {
  cloneSerializable,
  toIsoOrNull,
  toRequiredId,
} from "./serializers.shared.js";

const structureKeyForStage = ({ issue, stage }) =>
  stage === "criteriaWeighting"
    ? issue.criteriaWeightsStructureKey
    : issue.evaluationStructureKey;

const contextIdFor = ({ stage, phase }) => `${stage}:${phase}`;

const serializeContextModel = ({ model, runtimeApiModelKey = null }) =>
  model
    ? {
        id: toRequiredId(model, "evaluation context model"),
        name: model.name ?? null,
        apiModelKey: runtimeApiModelKey ?? model.apiModelKey ?? null,
      }
    : null;

const findPreviousStageResult = ({ stage, phase, rawPhaseResults }) =>
  rawPhaseResults
    .filter(
      (result) =>
        result.stage === stage &&
        Number.isInteger(result.consensusPhase) &&
        result.consensusPhase < phase
    )
    .sort((left, right) => right.consensusPhase - left.consensusPhase)[0] ?? null;

const serializeLeafCriteria = ({ criteria, expressionDomainsById }) =>
  criteria.nodes
    .filter((criterion) => criterion.isLeaf)
    .map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      type: criterion.type,
      expressionDomain: criterion.expressionDomainId
        ? expressionDomainsById.get(criterion.expressionDomainId) || null
        : null,
    }));

const serializeContext = ({
  issue,
  stage,
  phase,
  structureKey,
  alternatives,
  criteria,
  expressionDomainsById,
  rawPhaseResults,
  evaluations,
  participants,
}) => {
  const currentResult = rawPhaseResults.find(
    (result) => result.stage === stage && result.consensusPhase === phase
  );
  const previousResult = findPreviousStageResult({ stage, phase, rawPhaseResults });
  const leafCriteria = serializeLeafCriteria({ criteria, expressionDomainsById });
  const decisionModel = serializeContextModel({
    model: issue.model,
    runtimeApiModelKey: issue.apiModelKey,
  });
  const criteriaWeightingModel = serializeContextModel({
    model: issue.criteriaWeightingModel,
    runtimeApiModelKey: issue.criteriaWeightingApiModelKey,
  });
  const activeModel =
    stage === "criteriaWeighting" ? criteriaWeightingModel : decisionModel;
  const expertIds = [
    ...new Set(
      evaluations
        .filter(
          (evaluation) =>
            evaluation.stage === stage && evaluation.consensusPhase === phase
        )
        .map((evaluation) => toRequiredId(evaluation.expert, "evaluation expert"))
    ),
  ];
  const participantByExpertId = new Map(
    participants.map((participation) => [
      toRequiredId(participation.expert, "participation expert"),
      participation,
    ])
  );
  const expertWeights = {};
  for (const entry of currentResult?.inputSnapshot?.expertWeights || []) {
    const expertId = toRequiredId(entry.expert, "expert weight expert");
    expertWeights[expertId] = entry.weight;
  }

  return {
    id: contextIdFor({ stage, phase }),
    stage,
    phase,
    structureKey,
    modelId: decisionModel.id,
    activeModelId: activeModel?.id ?? null,
    modelParameters: cloneSerializable(issue.modelParameters, {}),
    criteriaWeightingModelId: issue.criteriaWeightingModel
      ? toRequiredId(issue.criteriaWeightingModel, "criteria weighting model")
      : null,
    criteriaWeightingParameters: cloneSerializable(issue.criteriaWeightingParameters, {}),
    alternativeIds: alternatives.map((alternative) => alternative.id),
    criterionIds: criteria.nodes.map((criterion) => criterion.id),
    expressionDomainIds: leafCriteria
      .map((criterion) => criterion.expressionDomain?.id || null)
      .filter(Boolean),
    decisionContext: {
      issue: {
        id: toRequiredId(issue, "issue"),
        name: issue.name,
        currentStage: issue.currentStage,
        consensusPhase: phase,
        isConsensus: issue.isConsensus === true,
        consensusThreshold: issue.consensusThreshold ?? null,
        consensusMaxPhases: issue.consensusMaxPhases ?? null,
      },
      structure: { key: structureKey, stage },
      model: activeModel,
      modelParameters: cloneSerializable(issue.modelParameters, {}),
      criteriaWeightingParameters: cloneSerializable(issue.criteriaWeightingParameters, {}),
      alternatives: alternatives.map(({ id, name }) => ({ id, name })),
      criteriaTree: serializeCriterionTreeForContext({ criteria }),
      leafCriteria,
      experts: expertIds.map((id) => ({
        id,
        name: participantByExpertId.get(id)?.expert?.name ?? null,
      })),
      criteriaWeights: cloneSerializable(issue?.modelParameters?.weights, {}),
      expertWeights,
      consensus: {
        phase,
        maxPhases: issue.consensusMaxPhases ?? null,
        threshold: issue.consensusThreshold ?? null,
        currentCollectiveEvaluations: cloneSerializable(
          currentResult?.result?.standardResult?.collectiveEvaluations,
          {}
        ),
        previousCollectiveEvaluations: cloneSerializable(
          previousResult?.result?.standardResult?.collectiveEvaluations,
          {}
        ),
      },
    },
  };
};

export const serializeEvaluations = async ({
  issue,
  evaluations,
  phaseResults,
  rawPhaseResults,
  alternatives,
  criteria,
  expressionDomains,
  participants = [],
}) => {
  const expressionDomainsById = new Map(expressionDomains.map((domain) => [domain.id, domain]));
  const rawPhaseResultByStagePhase = new Map(
    rawPhaseResults.map((result) => [`${result.stage}:${result.consensusPhase}`, result])
  );
  const contextSources = new Map();

  for (const evaluation of evaluations) {
    contextSources.set(
      contextIdFor({ stage: evaluation.stage, phase: evaluation.consensusPhase }),
      { stage: evaluation.stage, phase: evaluation.consensusPhase }
    );
  }
  for (const result of phaseResults) {
    contextSources.set(
      contextIdFor({ stage: result.stage, phase: result.phase }),
      { stage: result.stage, phase: result.phase }
    );
  }

  const contexts = [];
  const contextById = new Map();
  for (const source of [...contextSources.values()].sort((left, right) =>
    contextIdFor(left).localeCompare(contextIdFor(right))
  )) {
    const structureKey = structureKeyForStage({ issue, stage: source.stage });
    if (!structureKey) {
      throw createInternalError("Finished evaluation stage is missing a structure key", {
        field: "structureKey",
        details: source,
      });
    }
    getEvaluationStructureOrThrow(structureKey);
    const context = serializeContext({
      issue,
      ...source,
      structureKey,
      alternatives,
      criteria,
      expressionDomainsById,
      rawPhaseResults,
      evaluations,
      participants,
    });
    contexts.push(context);
    contextById.set(context.id, context);
  }

  const individual = [];
  for (const evaluation of evaluations) {
    const contextId = contextIdFor({ stage: evaluation.stage, phase: evaluation.consensusPhase });
    const context = contextById.get(contextId);
    const structure = getEvaluationStructureOrThrow(context.structureKey);
    let displayPayload = null;

    if (structure.stage !== evaluation.stage) {
      throw createInternalError("Finished evaluation structure stage does not match", {
        field: "structureKey",
        details: { evaluationId: toRequiredId(evaluation, "evaluation") },
      });
    }

    if (typeof structure.get === "function") {
      try {
        displayPayload = await structure.get({
          payload: evaluation.payload ?? {},
          decisionContext: context.decisionContext,
        });
      } catch (error) {
        throw createInternalError(
          "Finished evaluation display transformation failed",
          {
            field: "evaluations.displayPayload",
            details: {
              evaluationId: toRequiredId(evaluation, "evaluation"),
              structureKey: context.structureKey,
              stage: evaluation.stage,
              phase: evaluation.consensusPhase,
            },
            cause: error,
          }
        );
      }
    }

    individual.push({
      id: toRequiredId(evaluation, "evaluation"),
      expertId: toRequiredId(evaluation.expert, "evaluation expert"),
      stage: evaluation.stage,
      phase: evaluation.consensusPhase,
      structureKey: context.structureKey,
      rawPayload: cloneSerializable(evaluation.payload, {}),
      displayPayload: cloneSerializable(displayPayload, null),
      completed: evaluation.completed === true,
      submittedAt: toIsoOrNull(evaluation.submittedAt),
      createdAt: toIsoOrNull(evaluation.createdAt),
      updatedAt: toIsoOrNull(evaluation.updatedAt),
      contextId,
    });
  }

  const collective = phaseResults.map((result) => ({
    phaseResultId: result.id,
    stage: result.stage,
    phase: result.phase,
    rawPayload: cloneSerializable(
      rawPhaseResultByStagePhase.get(`${result.stage}:${result.phase}`)?.result?.standardResult?.collectiveEvaluations,
      {}
    ),
    displayPayload: null,
  }));

  return {
    individual: individual.sort((left, right) => left.id.localeCompare(right.id)),
    collective,
    contexts,
  };
};
