import {
  EVALUATION_STAGES,
  getEvaluationStructureOrThrow,
} from "../../../decisionEngine/evaluations/index.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../../utils/common/errors.js";
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
    const valueCount = Number(domain.valueCount);
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
  isSingleLeafCriterion,
  model,
  fuzzyValueCount = null,
  apiModelsBaseUrl,
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
        modelWeights: [Array.from({ length: fuzzyValueCount }, () => 1)],
        currentStage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        isCriteriaWeightingRequired: false,
      });
    }

    const modelWeights = normalizeCreatorFuzzyWeightsOrThrow({
      payload: resolvedConfig.payload,
      criterionNames,
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
    const fixedWeights = [1];

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
      criterionNames,
    });
  } else if (resolvedConfig.method === "apiModel") {
    modelWeights = await resolveCreatorApiCriteriaWeightingModelWeightsOrThrow({
      payload: resolvedConfig.payload,
      criterionNames,
      criteriaWeightingModel,
      criteriaWeightingRuntime,
      criteriaWeightingParameters: normalizedCriteriaWeightingParameters,
      apiModelsBaseUrl,
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
