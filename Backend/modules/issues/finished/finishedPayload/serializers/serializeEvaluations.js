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
  phaseResultByStagePhase,
}) => {
  const currentResult = phaseResultByStagePhase.get(`${stage}:${phase}`);
  const previousResult = phaseResultByStagePhase.get(`${stage}:${phase - 1}`);
  const leafCriteria = serializeLeafCriteria({ criteria, expressionDomainsById });
  const modelId = toRequiredId(issue.model, "base model");

  return {
    id: contextIdFor({ stage, phase }),
    stage,
    phase,
    structureKey,
    modelId,
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
    serializedContext: {
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
      model: {
        id: modelId,
        name: issue.model?.name ?? null,
        apiModelKey: issue.apiModelKey ?? issue.model?.apiModelKey ?? null,
      },
      modelParameters: cloneSerializable(issue.modelParameters, {}),
      criteriaWeightingParameters: cloneSerializable(issue.criteriaWeightingParameters, {}),
      alternatives: alternatives.map(({ id, name }) => ({ id, name })),
      criteriaTree: serializeCriterionTreeForContext({ criteria }),
      leafCriteria,
      consensus: {
        phase,
        maxPhases: issue.consensusMaxPhases ?? null,
        threshold: issue.consensusThreshold ?? null,
        currentCollectiveEvaluations: cloneSerializable(
          currentResult?.collectiveEvaluations,
          {}
        ),
        previousCollectiveEvaluations: cloneSerializable(
          previousResult?.collectiveEvaluations,
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
}) => {
  const expressionDomainsById = new Map(expressionDomains.map((domain) => [domain.id, domain]));
  const phaseResultByStagePhase = new Map(
    phaseResults.map((result) => [`${result.stage}:${result.phase}`, result])
  );
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
      phaseResultByStagePhase,
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
          evaluationContext: context.serializedContext,
        });
      } catch {
        displayPayload = null;
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
      rawPhaseResultByStagePhase.get(`${result.stage}:${result.phase}`)?.collectiveEvaluations,
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
