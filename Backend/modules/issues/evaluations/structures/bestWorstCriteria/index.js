import {
  EVALUATION_STAGES,
  EVALUATION_STRUCTURE_KEYS,
} from "../../evaluation.constants.js";
import { createBadRequestError } from "../../../../../utils/common/errors.js";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../../../services/modelApi/modelResponse.js";
import { getOrderedCriterionNames } from "../shared/criteriaWeighting.helpers.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const buildEmptyComparisons = (criterionNames) =>
  criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = "";
    return accumulator;
  }, {});

const normalizeComparisonValueOrThrow = (rawValue, { field }) => {
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    return "";
  }

  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    throw createBadRequestError("Comparison value must be a finite number", {
      field,
    });
  }

  return numericValue;
};

const normalizeComparisonsMapOrThrow = (rawComparisons, criterionNames, { field }) => {
  if (!isPlainObject(rawComparisons)) {
    throw createBadRequestError(`${field} must be an object`, {
      field,
    });
  }

  return criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = normalizeComparisonValueOrThrow(
      rawComparisons[criterionName],
      { field }
    );
    return accumulator;
  }, {});
};

const normalizePayloadOrThrow = async ({ payload, issue }) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  const { criterionNames } = await getOrderedCriterionNames({ issue });

  const bestCriterion = normalizeText(payload.bestCriterion);
  const worstCriterion = normalizeText(payload.worstCriterion);

  const bestToOthers = normalizeComparisonsMapOrThrow(
    payload.bestToOthers,
    criterionNames,
    {
      field: "payload.bestToOthers",
    }
  );

  const othersToWorst = normalizeComparisonsMapOrThrow(
    payload.othersToWorst,
    criterionNames,
    {
      field: "payload.othersToWorst",
    }
  );

  if (bestCriterion) {
    bestToOthers[bestCriterion] = 1;
  }

  if (worstCriterion) {
    othersToWorst[worstCriterion] = 1;
  }

  return {
    criterionNames,
    payload: {
      bestCriterion,
      worstCriterion,
      bestToOthers,
      othersToWorst,
    },
  };
};

const validateSubmittedBwmPayloadOrThrow = ({ criterionNames, payload }) => {
  const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } = payload;

  if (!bestCriterion) {
    throw createBadRequestError("bestCriterion is required", {
      field: "payload.bestCriterion",
    });
  }

  if (!worstCriterion) {
    throw createBadRequestError("worstCriterion is required", {
      field: "payload.worstCriterion",
    });
  }

  if (!criterionNames.includes(bestCriterion)) {
    throw createBadRequestError("bestCriterion must be a valid criterion name", {
      field: "payload.bestCriterion",
    });
  }

  if (!criterionNames.includes(worstCriterion)) {
    throw createBadRequestError("worstCriterion must be a valid criterion name", {
      field: "payload.worstCriterion",
    });
  }

  if (criterionNames.length > 1 && bestCriterion === worstCriterion) {
    throw createBadRequestError(
      "bestCriterion and worstCriterion must be different",
      {
        field: "payload.worstCriterion",
      }
    );
  }

  for (const criterionName of criterionNames) {
    const bestToOthersValue = Number(bestToOthers[criterionName]);
    const othersToWorstValue = Number(othersToWorst[criterionName]);

    if (criterionName !== bestCriterion) {
      if (!Number.isFinite(bestToOthersValue) || bestToOthersValue < 1 || bestToOthersValue > 9) {
        throw createBadRequestError(
          `bestToOthers['${criterionName}'] must be a finite number between 1 and 9`,
          {
            field: "payload.bestToOthers",
          }
        );
      }
    }

    if (criterionName !== worstCriterion) {
      if (!Number.isFinite(othersToWorstValue) || othersToWorstValue < 1 || othersToWorstValue > 9) {
        throw createBadRequestError(
          `othersToWorst['${criterionName}'] must be a finite number between 1 and 9`,
          {
            field: "payload.othersToWorst",
          }
        );
      }
    }
  }

  if (Number(bestToOthers[bestCriterion]) !== 1) {
    throw createBadRequestError("bestToOthers[bestCriterion] must be 1", {
      field: "payload.bestToOthers",
    });
  }

  if (Number(othersToWorst[worstCriterion]) !== 1) {
    throw createBadRequestError("othersToWorst[worstCriterion] must be 1", {
      field: "payload.othersToWorst",
    });
  }
};

const mergeStoredPayload = ({ storedPayload, criterionNames }) => {
  const payload = isPlainObject(storedPayload) ? storedPayload : {};
  const bestToOthersSource = isPlainObject(payload.bestToOthers)
    ? payload.bestToOthers
    : {};
  const othersToWorstSource = isPlainObject(payload.othersToWorst)
    ? payload.othersToWorst
    : {};

  return {
    bestCriterion: normalizeText(payload.bestCriterion),
    worstCriterion: normalizeText(payload.worstCriterion),
    bestToOthers: criterionNames.reduce((accumulator, criterionName) => {
      accumulator[criterionName] =
        bestToOthersSource[criterionName] === undefined
          ? ""
          : bestToOthersSource[criterionName];
      return accumulator;
    }, {}),
    othersToWorst: criterionNames.reduce((accumulator, criterionName) => {
      accumulator[criterionName] =
        othersToWorstSource[criterionName] === undefined
          ? ""
          : othersToWorstSource[criterionName];
      return accumulator;
    }, {}),
  };
};

const buildExpertsDataOrThrow = ({ evaluations, criterionNames }) => {
  const expertsData = {};

  for (const evaluation of evaluations) {
    const payload = evaluation?.payload;

    if (!isPlainObject(payload)) {
      continue;
    }

    const normalized = {
      bestCriterion: normalizeText(payload.bestCriterion),
      worstCriterion: normalizeText(payload.worstCriterion),
      bestToOthers: payload.bestToOthers,
      othersToWorst: payload.othersToWorst,
    };

    validateSubmittedBwmPayloadOrThrow({
      criterionNames,
      payload: normalized,
    });

    const mic = criterionNames.map((criterionName) =>
      Number(normalized.bestToOthers[criterionName])
    );
    const lic = criterionNames.map((criterionName) =>
      Number(normalized.othersToWorst[criterionName])
    );

    if (
      mic.some((value) => !Number.isFinite(value)) ||
      lic.some((value) => !Number.isFinite(value))
    ) {
      continue;
    }

    const expertRef = evaluation?.expert;
    const expertKey = normalizeText(expertRef?.email)
      ? expertRef.email
      : `expert_${String(expertRef?._id || expertRef || "unknown")}`;

    expertsData[expertKey] = {
      mic,
      lic,
    };
  }

  if (Object.keys(expertsData).length === 0) {
    throw createBadRequestError("Incomplete BWM data from experts", {
      field: "payload",
    });
  }

  return expertsData;
};

const normalizeBwmWeightsOrThrow = ({ weights, criterionCount }) => {
  if (!Array.isArray(weights) || weights.length < criterionCount) {
    throw createBadRequestError("ApiModels BWM output does not contain valid weights", {
      field: "result.weights",
    });
  }

  const baseWeights = weights.slice(0, criterionCount).map(Number);

  if (baseWeights.some((value) => !Number.isFinite(value))) {
    throw createBadRequestError("ApiModels BWM output contains invalid weights", {
      field: "result.weights",
    });
  }

  const total = baseWeights.reduce((sum, value) => sum + value, 0);

  if (!(total > 0)) {
    throw createBadRequestError("ApiModels BWM output weights cannot be normalized", {
      field: "result.weights",
    });
  }

  return baseWeights.map((value) => value / total);
};

export const bestWorstCriteriaStructure = Object.freeze({
  key: EVALUATION_STRUCTURE_KEYS.BEST_WORST_CRITERIA,
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,

  async init({ issue }) {
    const { criterionNames } = await getOrderedCriterionNames({ issue });

    return {
      bestCriterion: "",
      worstCriterion: "",
      bestToOthers: buildEmptyComparisons(criterionNames),
      othersToWorst: buildEmptyComparisons(criterionNames),
    };
  },

  async get({ storedEvaluation, issue }) {
    const { criterionNames } = await getOrderedCriterionNames({ issue });

    if (!storedEvaluation) {
      return {
        bestCriterion: "",
        worstCriterion: "",
        bestToOthers: buildEmptyComparisons(criterionNames),
        othersToWorst: buildEmptyComparisons(criterionNames),
      };
    }

    return mergeStoredPayload({
      storedPayload: storedEvaluation?.payload,
      criterionNames,
    });
  },

  async send({ payload, issue }) {
    const normalized = await normalizePayloadOrThrow({ payload, issue });

    return normalized.payload;
  },

  async submit({ payload, issue }) {
    const normalized = await normalizePayloadOrThrow({ payload, issue });

    validateSubmittedBwmPayloadOrThrow({
      criterionNames: normalized.criterionNames,
      payload: normalized.payload,
    });

    return normalized.payload;
  },

  async compute({ issue, evaluations, apiModelsBaseUrl, httpClient }) {
    const { criterionNames } = await getOrderedCriterionNames({ issue });

    const expertsData = buildExpertsDataOrThrow({
      evaluations,
      criterionNames,
    });

    let response;

    try {
      response = await httpClient.post(`${apiModelsBaseUrl}/bwm`, {
        experts_data: expertsData,
        eps_penalty: 1,
      });
    } catch (error) {
      throw createModelApiRequestError(error, "Failed to compute BWM weights");
    }

    const results = unwrapModelApiResponse(response, "Failed to compute BWM weights");
    const normalizedWeights = normalizeBwmWeightsOrThrow({
      weights: results?.weights,
      criterionCount: criterionNames.length,
    });

    return {
      message: `Criteria weights for '${issue.name}' successfully computed.`,
      consensusMeasure: null,
      consensusLifecycle: null,
      ranking: [],
      rankedWithScores: [],
      scoresByAlternative: {},
      collectiveEvaluations: {},
      plotsGraphic: {},
      modelExecution: {
        kind: "apiModels",
        structureKey: EVALUATION_STRUCTURE_KEYS.BEST_WORST_CRITERIA,
        apiEndpointPath: "/bwm",
        executedAt: new Date(),
      },
      rawOutput: results,
      issueUpdates: {
        modelParameters: {
          ...(issue?.modelParameters || {}),
          weights: normalizedWeights,
        },
      },
      nextCurrentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    };
  },
});
