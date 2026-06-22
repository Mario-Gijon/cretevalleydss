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
  normalizeCreatorApiCriteriaWeightingPayloadOrThrow,
  resolveCreatorApiCriteriaWeightingModelWeightsOrThrow,
} from "./runCriteriaWeightApiModel.js";
import { isPlainObject } from "../../../../utils/common/objects.js";

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
  criteriaWeightsStructureKey,
  criteriaWeightingModel,
  criteriaWeightingRuntime,
  criteriaWeightingApiModelKey,
  criteriaWeightingApiEndpoint,
  criteriaWeightingParameters,
  modelWeights,
  deferredPayload = null,
  isDeferredApiCriteriaWeighting = false,
  currentStage,
  isCriteriaWeightingRequired,
}) => {
  return {
    criteriaWeightsStructureKey,
    criteriaWeightingModel,
    criteriaWeightingRuntime,
    criteriaWeightingApiModelKey,
    criteriaWeightingApiEndpoint,
    criteriaWeightingParameters,
    modelWeights,
    deferredPayload,
    isDeferredApiCriteriaWeighting,
    currentStage,
    isCriteriaWeightingRequired,
  };
};

const buildNoCriteriaWeightingResolution = () =>
  buildResolvedCriteriaWeightingConfig({
    criteriaWeightsStructureKey: null,
    criteriaWeightingModel: null,
    criteriaWeightingRuntime: null,
    criteriaWeightingApiModelKey: null,
    criteriaWeightingApiEndpoint: null,
    criteriaWeightingParameters: {},
    modelWeights: null,
    deferredPayload: null,
    isDeferredApiCriteriaWeighting: false,
    currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    isCriteriaWeightingRequired: false,
  });

const remapCriterionIdOrThrow = ({
  criterionId,
  idMap,
  field,
}) => {
  const normalizedCriterionId = String(criterionId || "").trim();
  if (!normalizedCriterionId) {
    throw createBadRequestError("Criterion id is required for criteria weighting payload", {
      field,
    });
  }

  const persistedCriterionId = idMap.get(normalizedCriterionId);
  if (!persistedCriterionId) {
    throw createBadRequestError("Unable to remap criteria weighting payload to persisted criteria", {
      field,
      details: {
        criterionId: normalizedCriterionId,
      },
    });
  }

  return persistedCriterionId;
};

const remapBestWorstCriteriaPayloadOrThrow = ({
  payload,
  idMap,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("criteriaWeightingConfig.payload must be an object", {
      field: "criteriaWeightingConfig.payload",
    });
  }

  const bestToOthers = payload.bestToOthers;
  const othersToWorst = payload.othersToWorst;

  if (!isPlainObject(bestToOthers)) {
    throw createBadRequestError("criteriaWeightingConfig.payload.bestToOthers must be an object", {
      field: "criteriaWeightingConfig.payload.bestToOthers",
    });
  }

  if (!isPlainObject(othersToWorst)) {
    throw createBadRequestError("criteriaWeightingConfig.payload.othersToWorst must be an object", {
      field: "criteriaWeightingConfig.payload.othersToWorst",
    });
  }

  const remappedBestCriterion = remapCriterionIdOrThrow({
    criterionId: payload.bestCriterion,
    idMap,
    field: "criteriaWeightingConfig.payload.bestCriterion",
  });
  const remappedWorstCriterion = remapCriterionIdOrThrow({
    criterionId: payload.worstCriterion,
    idMap,
    field: "criteriaWeightingConfig.payload.worstCriterion",
  });

  const remappedBestToOthers = Object.entries(bestToOthers).reduce(
    (accumulator, [criterionId, value]) => {
      accumulator[
        remapCriterionIdOrThrow({
          criterionId,
          idMap,
          field: "criteriaWeightingConfig.payload.bestToOthers",
        })
      ] = value;
      return accumulator;
    },
    {}
  );

  const remappedOthersToWorst = Object.entries(othersToWorst).reduce(
    (accumulator, [criterionId, value]) => {
      accumulator[
        remapCriterionIdOrThrow({
          criterionId,
          idMap,
          field: "criteriaWeightingConfig.payload.othersToWorst",
        })
      ] = value;
      return accumulator;
    },
    {}
  );

  return {
    ...payload,
    bestCriterion: remappedBestCriterion,
    worstCriterion: remappedWorstCriterion,
    bestToOthers: remappedBestToOthers,
    othersToWorst: remappedOthersToWorst,
  };
};

const remapDeferredCriteriaWeightingPayloadOrThrow = ({
  resolvedCriteriaWeighting,
  idMap,
}) => {
  if (!resolvedCriteriaWeighting.isDeferredApiCriteriaWeighting) {
    return null;
  }

  if (resolvedCriteriaWeighting.criteriaWeightsStructureKey === "bestWorstCriteria") {
    return remapBestWorstCriteriaPayloadOrThrow({
      payload: resolvedCriteriaWeighting.deferredPayload,
      idMap,
    });
  }

  throw createInternalError(
    `Unsupported deferred criteria weighting structure '${resolvedCriteriaWeighting.criteriaWeightsStructureKey}'`,
    {
      field: "criteriaWeightingConfig.structureKey",
    }
  );
};

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
    return criteriaWeightingRuntime.criteriaWeightsStructureKey;
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
      leafCriteria,
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
      criteriaWeightsStructureKey: resolvedStructureKey,
      criteriaWeightingModel: null,
      criteriaWeightingRuntime: null,
      criteriaWeightingApiModelKey: null,
      criteriaWeightingApiEndpoint: null,
      criteriaWeightingParameters: {},
      modelWeights: {
        [criterionIds[0]]: Array.from({ length: fuzzyValueCount }, () => 1),
      },
      deferredPayload: null,
      isDeferredApiCriteriaWeighting: false,
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
      criteriaWeightsStructureKey: resolvedStructureKey,
      criteriaWeightingModel: null,
      criteriaWeightingRuntime: null,
      criteriaWeightingApiModelKey: null,
      criteriaWeightingApiEndpoint: null,
      criteriaWeightingParameters: {},
      modelWeights,
      deferredPayload: null,
      isDeferredApiCriteriaWeighting: false,
      currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      isCriteriaWeightingRequired: false,
    });
  }

  if (isSingleLeafCriterion) {
    const fixedWeights = {
      [criterionIds[0]]: 1,
    };

    return buildResolvedCriteriaWeightingConfig({
      criteriaWeightsStructureKey: resolvedStructureKey,
      criteriaWeightingModel,
      criteriaWeightingRuntime,
      criteriaWeightingApiModelKey: apiModelMetadata.criteriaWeightingApiModelKey,
      criteriaWeightingApiEndpoint: apiModelMetadata.criteriaWeightingApiEndpoint,
      criteriaWeightingParameters: apiModelMetadata.criteriaWeightingParameters,
      modelWeights: fixedWeights,
      deferredPayload: null,
      isDeferredApiCriteriaWeighting: false,
      currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      isCriteriaWeightingRequired: false,
    });
  }

  if (resolvedConfig.source === "experts") {
    return buildResolvedCriteriaWeightingConfig({
      criteriaWeightsStructureKey: resolvedStructureKey,
      criteriaWeightingModel,
      criteriaWeightingRuntime,
      criteriaWeightingApiModelKey: apiModelMetadata.criteriaWeightingApiModelKey,
      criteriaWeightingApiEndpoint: apiModelMetadata.criteriaWeightingApiEndpoint,
      criteriaWeightingParameters: apiModelMetadata.criteriaWeightingParameters,
      modelWeights: null,
      deferredPayload: null,
      isDeferredApiCriteriaWeighting: false,
      currentStage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
      isCriteriaWeightingRequired: true,
    });
  }

  let modelWeights = null;
  let deferredPayload = null;
  let isDeferredApiCriteriaWeighting = false;

  if (resolvedConfig.method === "manual") {
    modelWeights = normalizeCreatorManualWeightsOrThrow({
      payload: resolvedConfig.payload,
      leafCriteria,
    });
  } else if (resolvedConfig.method === "apiModel") {
    deferredPayload = await normalizeCreatorApiCriteriaWeightingPayloadOrThrow({
      payload: resolvedConfig.payload,
      leafCriteria,
      criteriaWeightingModel,
      criteriaWeightingRuntime,
      criteriaWeightingParameters: normalizedCriteriaWeightingParameters,
    });
    isDeferredApiCriteriaWeighting = true;
  } else {
    throw createBadRequestError(
      `Unsupported criteria weighting method: ${resolvedConfig.method}`,
      {
        field: "criteriaWeightingConfig.method",
      }
    );
  }

  return buildResolvedCriteriaWeightingConfig({
    criteriaWeightsStructureKey: resolvedStructureKey,
    criteriaWeightingModel,
    criteriaWeightingRuntime,
    criteriaWeightingApiModelKey: apiModelMetadata.criteriaWeightingApiModelKey,
    criteriaWeightingApiEndpoint: apiModelMetadata.criteriaWeightingApiEndpoint,
    criteriaWeightingParameters: apiModelMetadata.criteriaWeightingParameters,
    modelWeights,
    deferredPayload,
    isDeferredApiCriteriaWeighting,
    currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    isCriteriaWeightingRequired: false,
  });
};

export const remapCriteriaWeightIdsToMongoCriteriaOrThrow = ({
  resolvedCriteriaWeighting,
  sourceLeafCriteria,
  persistedLeafCriteria,
}) => {
  const hasModelWeights = resolvedCriteriaWeighting.modelWeights !== null;
  const hasDeferredPayload =
    resolvedCriteriaWeighting.isDeferredApiCriteriaWeighting === true &&
    resolvedCriteriaWeighting.deferredPayload !== null;

  if (!hasModelWeights && !hasDeferredPayload) {
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
  const criterionIdMap = new Map();

  sourceCriterionIds.forEach((sourceCriterionId, index) => {
    const persistedCriterionId = persistedCriterionIds[index];
    criterionIdMap.set(sourceCriterionId, persistedCriterionId);
    const value = hasModelWeights
      ? resolvedCriteriaWeighting.modelWeights[sourceCriterionId]
      : undefined;

    if (hasModelWeights && value === undefined) {
      throw createInternalError("Criteria weight is missing during persistence remap", {
        field: "modelParameters.weights",
        details: {
          sourceCriterionId,
          persistedCriterionId,
        },
      });
    }

    if (hasModelWeights) {
      remappedWeights[persistedCriterionId] = value;
    }
  });

  return {
    ...resolvedCriteriaWeighting,
    modelWeights: hasModelWeights ? remappedWeights : null,
    deferredPayload: hasDeferredPayload
      ? remapDeferredCriteriaWeightingPayloadOrThrow({
          resolvedCriteriaWeighting,
          idMap: criterionIdMap,
        })
      : null,
  };
};

export const resolveDeferredCriteriaWeightingAfterPersistenceOrThrow = async ({
  resolvedCriteriaWeighting,
  persistedLeafCriteria,
  decisionModelsServiceBaseUrl,
  httpClient,
}) => {
  if (!resolvedCriteriaWeighting.isDeferredApiCriteriaWeighting) {
    return resolvedCriteriaWeighting;
  }

  const modelWeights =
    await resolveCreatorApiCriteriaWeightingModelWeightsOrThrow({
      payload: resolvedCriteriaWeighting.deferredPayload,
      leafCriteria: persistedLeafCriteria,
      criteriaWeightingModel: resolvedCriteriaWeighting.criteriaWeightingModel,
      criteriaWeightingRuntime: resolvedCriteriaWeighting.criteriaWeightingRuntime,
      criteriaWeightingParameters:
        resolvedCriteriaWeighting.criteriaWeightingParameters,
      decisionModelsServiceBaseUrl,
      httpClient,
    });

  return {
    ...resolvedCriteriaWeighting,
    modelWeights,
    deferredPayload: null,
    isDeferredApiCriteriaWeighting: false,
  };
};
