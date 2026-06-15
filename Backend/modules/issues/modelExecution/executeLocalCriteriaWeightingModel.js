import { createBadRequestError } from "../../../utils/common/errors.js";

const executeManualCriteriaWeightingModel = async ({
  structure,
  requestPayload,
}) => {
  const structureKey = structure?.key;
  const criteria = requestPayload?.context?.criteria;
  const evaluations = requestPayload?.evaluations;

  if (!Array.isArray(criteria) || criteria.length === 0) {
    throw createBadRequestError(
      "Manual criteria weights require criteria context",
      {
        field: "context.criteria",
      }
    );
  }

  for (const criterion of criteria) {
    if (typeof criterion?.name !== "string" || criterion.name.trim() === "") {
      throw createBadRequestError(
        "Manual criteria weights require every criterion to have a name",
        {
          field: "context.criteria",
        }
      );
    }
  }

  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    throw createBadRequestError(
      "Manual criteria weights require completed evaluations",
      {
        field: "evaluations",
      }
    );
  }

  const criterionNames = criteria.map((criterion) => criterion.name);
  const criteriaSums = criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = 0;
    return accumulator;
  }, {});
  const evaluationContext = {
    issue: {
      id: requestPayload?.context?.issue?.id ?? null,
      name: requestPayload?.context?.issue?.name ?? null,
      currentStage: null,
      consensusPhase: requestPayload?.context?.consensusPhase ?? null,
      isConsensus: null,
      consensusThreshold: requestPayload?.context?.issue?.consensusThreshold ?? null,
      consensusMaxPhases: requestPayload?.context?.issue?.consensusMaxPhases ?? null,
    },
    structure: {
      key: structureKey ?? null,
      stage: requestPayload?.context?.structure?.stage ?? null,
    },
    model: {
      id: null,
      name: null,
      apiModelKey: null,
      modelFamilyKey: null,
      versionLabel: null,
    },
    parameters: {
      modelParameters: {},
      criteriaWeightingParameters: requestPayload?.modelParameters ?? {},
    },
    alternatives: {
      items: [],
      names: [],
      byId: {},
      byName: {},
    },
    criteria: {
      tree: [],
      leafItems: criteria.map((criterion) => ({
        id: criterion?.id ?? null,
        name: criterion?.name ?? "",
        type: criterion?.type ?? null,
        isLeaf: true,
        parentId: null,
        expressionDomain: null,
      })),
      leafNames: criterionNames,
      leafById: criteria.reduce((accumulator, criterion) => {
        if (criterion?.id) {
          accumulator[criterion.id] = {
            id: criterion.id,
            name: criterion.name,
            type: criterion.type ?? null,
            isLeaf: true,
            parentId: null,
            expressionDomain: null,
          };
        }
        return accumulator;
      }, {}),
      leafByName: criteria.reduce((accumulator, criterion) => {
        if (criterion?.name) {
          accumulator[criterion.name] = {
            id: criterion?.id ?? null,
            name: criterion.name,
            type: criterion.type ?? null,
            isLeaf: true,
            parentId: null,
            expressionDomain: null,
          };
        }
        return accumulator;
      }, {}),
    },
    domains: {
      byCriterionId: {},
      byCriterionName: {},
    },
    consensus: {
      phase: requestPayload?.context?.consensusPhase ?? null,
      maxPhases: requestPayload?.context?.issue?.consensusMaxPhases ?? null,
      threshold: requestPayload?.context?.issue?.consensusThreshold ?? null,
      currentCollectiveEvaluations: {},
      previousCollectiveEvaluations: {},
    },
  };

  for (const evaluation of evaluations) {
    const displayPayload = await structure.get({
      payload: evaluation?.payload ?? {},
      evaluationContext,
    });
    const weightsByCriterion = displayPayload.weightsByCriterion;

    for (const criterionName of criterionNames) {
      criteriaSums[criterionName] += Number(weightsByCriterion[criterionName]);
    }
  }

  const averagedWeightsByCriterion = criterionNames.reduce(
    (accumulator, criterionName) => {
      accumulator[criterionName] =
        criteriaSums[criterionName] / evaluations.length;
      return accumulator;
    },
    {}
  );

  const totalAverage = criterionNames.reduce(
    (total, criterionName) => total + averagedWeightsByCriterion[criterionName],
    0
  );

  if (!(totalAverage > 0)) {
    throw createBadRequestError(
      "Manual criteria weights cannot be normalized because their total is not positive",
      {
        field: "payload.weightsByCriterion",
      }
    );
  }

  const weightsByCriterion = criterionNames.reduce(
    (accumulator, criterionName) => {
      accumulator[criterionName] =
        averagedWeightsByCriterion[criterionName] / totalAverage;
      return accumulator;
    },
    {}
  );

  return {
    message: "Criteria weights computed successfully",
    consensusMeasure: null,
    weightsByCriterion,
    collectiveEvaluations: { weightsByCriterion },
    modelExecution: {
      kind: "local",
      structureKey,
      executedAt: new Date(),
    },
    rawOutput: {},
  };
};

const LOCAL_CRITERIA_WEIGHTING_EXECUTORS = Object.freeze({
  manualCriteriaWeights: executeManualCriteriaWeightingModel,
});

export const executeLocalCriteriaWeightingModelIfSupported = async ({
  structure,
  requestPayload,
}) => {
  const executor = LOCAL_CRITERIA_WEIGHTING_EXECUTORS[structure?.key];

  if (!executor) {
    return null;
  }

  return executor({
    structure,
    requestPayload,
  });
};
