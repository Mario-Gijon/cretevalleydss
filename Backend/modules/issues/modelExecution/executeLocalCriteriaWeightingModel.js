import { createBadRequestError } from "../../../utils/common/errors.js";
import { buildEvaluationContextFromCriteriaWeightingRequestPayload } from "../evaluations/buildEvaluationContextFromCriteriaWeightingRequestPayload.js";

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

  const evaluationContext =
    buildEvaluationContextFromCriteriaWeightingRequestPayload({
      requestPayload: {
        ...requestPayload,
        context: {
          ...requestPayload?.context,
          structure: {
            ...requestPayload?.context?.structure,
            key: structureKey ?? requestPayload?.context?.structure?.key ?? null,
          },
        },
      },
    });
  const criterionNames = Array.isArray(evaluationContext?.criteria?.leafNames)
    ? evaluationContext.criteria.leafNames
    : [];
  const criteriaSums = criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = 0;
    return accumulator;
  }, {});

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
