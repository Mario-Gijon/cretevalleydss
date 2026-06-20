import {
  EVALUATION_STAGES,
  getEvaluationStructureOrThrow,
} from "../../../decisionPlugins/evaluations/index.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { normalizeCreatorFuzzyWeightsOrThrow, normalizeCreatorManualWeightsOrThrow } from "./validateCriteriaWeightPayload.js";
import { resolveCriteriaWeightingModeConfigOrThrow } from "./resolveCriteriaWeightMode.js";
import {
  loadCriteriaWeightingApiModelContextOrThrow,
  resolveCreatorApiCriteriaWeightingModelWeightsOrThrow,
} from "./runCriteriaWeightApiModel.js";

const ensureCriteriaNamesOrThrow = (criterionNames) => {
  if (criterionNames.length === 0) {
    throw createInternalError("Issue has no leaf criteria", {
      field: "criteria",
    });
  }
};

const getCriterionIdsOrThrow = (leafCriteria) => {
  return leafCriteria.map((criterion) => {
    const criterionId = toIdString(criterion?.id ?? criterion?._id);

    if (!criterionId) {
      throw createInternalError("Leaf criterion id is required for criteria weights", {
        field: "criteria.id",
      });
    }

    return criterionId;
  });
};

const validateCriteriaWeightingModeSupportOrThrow = ({
  resolvedConfig,
  criteriaWeightingModel,
}) => {
  if (resolvedConfig.method !== "apiModel" || !criteriaWeightingModel) {
    return;
  }

  if (
    resolvedConfig.source === "creator" &&
    criteriaWeightingModel.supportsCreatorCriteriaWeighting !== true
  ) {
    throw createBadRequestError(
      "Selected criteria weighting model does not support creator-side weighting",
      {
        field: "criteriaWeightingConfig.mode",
      }
    );
  }

  if (
    resolvedConfig.source === "experts" &&
    criteriaWeightingModel.supportsExpertCriteriaWeighting !== true
  ) {
    throw createBadRequestError(
      "Selected criteria weighting model does not support expert-side weighting",
      {
        field: "criteriaWeightingConfig.mode",
      }
    );
  }
};

const buildResolvedCriteriaWeightingConfig = ({
  criteriaWeightingStructureKey,
  criteriaWeightingModel,
  criteriaWeightingApiModelKey,
  criteriaWeightingApiEndpoint,
  criteriaWeightingParameters,
  modelWeights,
  currentStage,
  isCriteriaWeightingRequired,
}) => {
  return {
    criteriaWeightingStructureKey,
    criteriaWeightingModel,
    criteriaWeightingApiModelKey,
    criteriaWeightingApiEndpoint,
    criteriaWeightingParameters,
    modelWeights,
    currentStage,
    isCriteriaWeightingRequired,
  };
};

const buildNoCriteriaWeightingResolution = () =>
  buildResolvedCriteriaWeightingConfig({
    criteriaWeightingStructureKey: null,
    criteriaWeightingModel: null,
    criteriaWeightingApiModelKey: null,
    criteriaWeightingApiEndpoint: null,
    criteriaWeightingParameters: {},
    modelWeights: null,
    currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    isCriteriaWeightingRequired: false,
  });

const resolveApiModelMetadata = ({
  resolvedConfig,
  criteriaWeightingRuntime,
  normalizedCriteriaWeightingParameters,
}) => {
  if (resolvedConfig.method !== "apiModel") {
    return {
      criteriaWeightingApiModelKey: null,
      criteriaWeightingApiEndpoint: null,
      criteriaWeightingParameters: {},
    };
  }

  return {
    criteriaWeightingApiModelKey: criteriaWeightingRuntime.apiModelKey,
    criteriaWeightingApiEndpoint: criteriaWeightingRuntime.apiEndpoint,
    criteriaWeightingParameters: normalizedCriteriaWeightingParameters,
  };
};

const resolveCriteriaWeightingStructureKey = ({
  resolvedConfig,
  criteriaWeightingRuntime,
}) => {
  if (resolvedConfig.method === "apiModel") {
    return criteriaWeightingRuntime.criteriaWeightingStructureKey;
  }

  return resolvedConfig.structureKey;
};

const validateCriteriaWeightingStructureOrThrow = ({
  resolvedStructureKey,
}) => {
  if (!resolvedStructureKey) {
    return;
  }

  const criteriaWeightingStructure = getEvaluationStructureOrThrow(
    resolvedStructureKey
  );

  if (criteriaWeightingStructure.stage !== EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    throw createBadRequestError(
      `Evaluation structure '${criteriaWeightingStructure.key}' does not support stage '${EVALUATION_STAGES.CRITERIA_WEIGHTING}'`,
      {
        code: "EVALUATION_STRUCTURE_STAGE_MISMATCH",
        field: "criteriaWeightingConfig.mode",
      }
    );
  }
};

export const resolveFuzzyCriteriaWeightValueCountOrThrow = ({
  model,
  domainDocs,
}) => {
  if (!model.usesFuzzyCriteriaWeights) {
    return null;
  }

  const linguisticDomains = domainDocs.filter(
    (domain) => domain.type === "linguistic"
  );

  if (linguisticDomains.length === 0) {
    throw createBadRequestError(
      "Fuzzy criteria weights require linguistic expression domains",
      {
        field: "expressionDomainConfig",
      }
    );
  }

  const valueCounts = new Set();

  for (const domain of linguisticDomains) {
    const valueCount = domain.valueCount;
    if (!Number.isInteger(valueCount) || valueCount < 2) {
      throw createBadRequestError(
        "Fuzzy criteria weights require a valid linguistic valueCount",
        {
          field: "expressionDomainConfig",
        }
      );
    }

    valueCounts.add(valueCount);
  }

  if (valueCounts.size !== 1) {
    throw createBadRequestError(
      "Fuzzy criteria weights require consistent linguistic valueCount across issue domains",
      {
        field: "expressionDomainConfig",
      }
    );
  }

  return Array.from(valueCounts)[0];
};

export const resolveCriteriaWeightingConfigOrThrow = async ({
  criteriaWeightingConfig,
  criteriaWeightingParameters,
  criterionNames,
  leafCriteria = [],
  isSingleLeafCriterion,
  model,
  fuzzyValueCount = null,
  decisionModelsServiceBaseUrl,
  httpClient,
  session = null,
}) => {
  ensureCriteriaNamesOrThrow(criterionNames);

  if (!model.usesCriteriaWeights) {
    return buildNoCriteriaWeightingResolution();
  }

  const resolvedConfig =
    resolveCriteriaWeightingModeConfigOrThrow(criteriaWeightingConfig);
  const fuzzyModel = model.usesFuzzyCriteriaWeights;

  if (fuzzyModel && resolvedConfig.mode !== "creatorFuzzy") {
    throw createBadRequestError("Fuzzy models require fuzzy criteria weights", {
      field: "criteriaWeightingConfig.mode",
    });
  }

  if (!fuzzyModel && resolvedConfig.mode === "creatorFuzzy") {
    throw createBadRequestError(
      "Fuzzy criteria weights are only available for fuzzy models",
      {
        field: "criteriaWeightingConfig.mode",
      }
    );
  }

  let criteriaWeightingModel = null;
  let criteriaWeightingRuntime = null;
  let normalizedCriteriaWeightingParameters = {};

  if (resolvedConfig.method === "apiModel") {
    const apiModelContext = await loadCriteriaWeightingApiModelContextOrThrow({
      resolvedConfig,
      criteriaWeightingParameters,
      criterionNames,
      session,
    });
    criteriaWeightingModel = apiModelContext.criteriaWeightingModel;
    criteriaWeightingRuntime = apiModelContext.criteriaWeightingRuntime;
    normalizedCriteriaWeightingParameters =
      apiModelContext.normalizedCriteriaWeightingParameters;
    validateCriteriaWeightingModeSupportOrThrow({
      resolvedConfig,
      criteriaWeightingModel,
    });
  }

  const resolvedStructureKey = resolveCriteriaWeightingStructureKey({
    resolvedConfig,
    criteriaWeightingRuntime,
  });
  validateCriteriaWeightingStructureOrThrow({
    resolvedStructureKey,
  });

  const apiModelMetadata = resolveApiModelMetadata({
    resolvedConfig,
    criteriaWeightingRuntime,
    normalizedCriteriaWeightingParameters,
  });
  const criterionIds = getCriterionIdsOrThrow(leafCriteria);

  if (resolvedConfig.mode === "creatorFuzzy") {
    if (!Number.isInteger(fuzzyValueCount) || fuzzyValueCount < 2) {
      throw createBadRequestError(
        "Fuzzy criteria weights require a valid linguistic valueCount from issue domains",
        {
          field: "criteriaWeightingConfig.mode",
        }
      );
    }

    if (isSingleLeafCriterion) {
      return buildResolvedCriteriaWeightingConfig({
        criteriaWeightingStructureKey: resolvedStructureKey,
        criteriaWeightingModel: null,
        criteriaWeightingApiModelKey: null,
        criteriaWeightingApiEndpoint: null,
        criteriaWeightingParameters: {},
        modelWeights: {
          [criterionIds[0]]: Array.from({ length: fuzzyValueCount }, () => 1),
        },
        currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        isCriteriaWeightingRequired: false,
      });
    }

    const modelWeights = normalizeCreatorFuzzyWeightsOrThrow({
      payload: resolvedConfig.payload,
      leafCriteria,
      valueCount: fuzzyValueCount,
    });

    return buildResolvedCriteriaWeightingConfig({
      criteriaWeightingStructureKey: resolvedStructureKey,
      criteriaWeightingModel: null,
      criteriaWeightingApiModelKey: null,
      criteriaWeightingApiEndpoint: null,
      criteriaWeightingParameters: {},
      modelWeights,
      currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      isCriteriaWeightingRequired: false,
    });
  }

  if (isSingleLeafCriterion) {
    const fixedWeights = {
      [criterionIds[0]]: 1,
    };

    return buildResolvedCriteriaWeightingConfig({
      criteriaWeightingStructureKey: resolvedStructureKey,
      criteriaWeightingModel,
      criteriaWeightingApiModelKey: apiModelMetadata.criteriaWeightingApiModelKey,
      criteriaWeightingApiEndpoint: apiModelMetadata.criteriaWeightingApiEndpoint,
      criteriaWeightingParameters: apiModelMetadata.criteriaWeightingParameters,
      modelWeights: fixedWeights,
      currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      isCriteriaWeightingRequired: false,
    });
  }

  if (resolvedConfig.source === "experts") {
    return buildResolvedCriteriaWeightingConfig({
      criteriaWeightingStructureKey: resolvedStructureKey,
      criteriaWeightingModel,
      criteriaWeightingApiModelKey: apiModelMetadata.criteriaWeightingApiModelKey,
      criteriaWeightingApiEndpoint: apiModelMetadata.criteriaWeightingApiEndpoint,
      criteriaWeightingParameters: apiModelMetadata.criteriaWeightingParameters,
      modelWeights: null,
      currentStage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      isCriteriaWeightingRequired: true,
    });
  }

  let modelWeights = null;

  if (resolvedConfig.method === "manual") {
    modelWeights = normalizeCreatorManualWeightsOrThrow({
      payload: resolvedConfig.payload,
      leafCriteria,
    });
  } else if (resolvedConfig.method === "apiModel") {
    modelWeights = await resolveCreatorApiCriteriaWeightingModelWeightsOrThrow({
      payload: resolvedConfig.payload,
      leafCriteria,
      criteriaWeightingModel,
      criteriaWeightingRuntime,
      criteriaWeightingParameters: normalizedCriteriaWeightingParameters,
      decisionModelsServiceBaseUrl,
      httpClient,
    });
  } else {
    throw createBadRequestError(
      `Unsupported criteria weighting method: ${resolvedConfig.method}`,
      {
        field: "criteriaWeightingConfig.method",
      }
    );
  }

  return buildResolvedCriteriaWeightingConfig({
    criteriaWeightingStructureKey: resolvedStructureKey,
    criteriaWeightingModel,
    criteriaWeightingApiModelKey: apiModelMetadata.criteriaWeightingApiModelKey,
    criteriaWeightingApiEndpoint: apiModelMetadata.criteriaWeightingApiEndpoint,
    criteriaWeightingParameters: apiModelMetadata.criteriaWeightingParameters,
    modelWeights,
    currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    isCriteriaWeightingRequired: false,
  });
};

export const remapCriteriaWeightIdsToMongoCriteriaOrThrow = ({
  resolvedCriteriaWeighting,
  sourceLeafCriteria,
  persistedLeafCriteria,
}) => {
  if (resolvedCriteriaWeighting.modelWeights === null) {
    return resolvedCriteriaWeighting;
  }

  const sourceCriterionIds = getCriterionIdsOrThrow(sourceLeafCriteria);
  const persistedCriterionIds = getCriterionIdsOrThrow(persistedLeafCriteria);

  if (sourceCriterionIds.length !== persistedCriterionIds.length) {
    throw createInternalError("Leaf criteria count changed while remapping weights", {
      field: "criteria",
      details: {
        sourceCount: sourceCriterionIds.length,
        persistedCount: persistedCriterionIds.length,
      },
    });
  }

  const remappedWeights = {};

  sourceCriterionIds.forEach((sourceCriterionId, index) => {
    const persistedCriterionId = persistedCriterionIds[index];
    const value = resolvedCriteriaWeighting.modelWeights[sourceCriterionId];

    if (value === undefined) {
      throw createInternalError("Criteria weight is missing during persistence remap", {
        field: "modelParameters.weights",
        details: {
          sourceCriterionId,
          persistedCriterionId,
        },
      });
    }

    remappedWeights[persistedCriterionId] = value;
  });

  return {
    ...resolvedCriteriaWeighting,
    modelWeights: remappedWeights,
  };
};
