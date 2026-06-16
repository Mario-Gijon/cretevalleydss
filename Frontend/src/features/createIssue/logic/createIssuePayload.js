import { getLeafCriteria } from "../../../utils/criteria.utils";
import {
  resolveExpressionDomainOptions,
  validateExpressionDomainConfig,
} from "../../../utils/domainAssignments.utils";
import {
  pruneCreateIssueParameterValues,
} from "../../modelParameters";
import {
  CREATE_ISSUE_CRITERIA_WEIGHTING_MODES,
  modelUsesCriteriaWeights,
  resolveAssignedFuzzyValueCount,
  validateCreateIssueFuzzyCriteriaWeighting,
  validateCreateIssueManualCriteriaWeighting,
} from "./createIssueCriteriaWeighting";
import { validateCreateIssueExpertWeights } from "./createIssueExpertWeights";

const normalizeConsensusMaxPhases = (value) =>
  value === null || value === undefined || value === "" ? null : Number(value);

const normalizeCriteriaWeightingParameters = (criteriaWeightingConfig) =>
  criteriaWeightingConfig?.criteriaWeightingParameters &&
  typeof criteriaWeightingConfig.criteriaWeightingParameters === "object" &&
  !Array.isArray(criteriaWeightingConfig.criteriaWeightingParameters)
    ? criteriaWeightingConfig.criteriaWeightingParameters
    : {};

export const buildCreateIssueRequestPayload = ({
  allData,
  selectedModel,
  selectedExperts,
  modelSupportsConsensusSimulation,
  simulateConsensus,
  consensusMaxPhases,
  consensusThreshold,
  criteria,
  globalDomains,
  expressionDomains,
  expressionDomainConfig,
  criteriaWeightingConfig,
  paramValues,
}) => {
  const modelRequiresConsensus = selectedModel?.supportsConsensus === true;

  const { validDomainIdSet } = resolveExpressionDomainOptions(
    selectedModel,
    globalDomains,
    expressionDomains
  );

  const leafCriteria = getLeafCriteria(criteria);
  if (
    !validateExpressionDomainConfig({
      expressionDomainConfig,
      leafCriteria,
      validDomainIdSet,
    })
  ) {
    return {
      ok: false,
      errorMessage:
        "You must assign a compatible expression domain to every leaf criterion before creating the issue.",
    };
  }

  if (selectedModel?.isMultiCriteria !== true && leafCriteria.length > 1) {
    return {
      ok: false,
      errorMessage: "This model does not support multiple criteria.",
    };
  }

  const rawConsensusThreshold = consensusThreshold;
  const normalizedConsensusThreshold = Number(rawConsensusThreshold);
  if (
    modelRequiresConsensus &&
    (
      rawConsensusThreshold === "" ||
      !Number.isFinite(normalizedConsensusThreshold) ||
      normalizedConsensusThreshold < 0 ||
      normalizedConsensusThreshold > 1
    )
  ) {
    return {
      ok: false,
      errorMessage: "Consensus threshold must be a finite number between 0 and 1.",
    };
  }

  const normalizedConsensusMaxPhases = normalizeConsensusMaxPhases(
    consensusMaxPhases
  );
  if (
    modelRequiresConsensus &&
    normalizedConsensusMaxPhases !== null &&
    (
      !Number.isFinite(normalizedConsensusMaxPhases) ||
      !Number.isInteger(normalizedConsensusMaxPhases) ||
      normalizedConsensusMaxPhases <= 0
    )
  ) {
    return {
      ok: false,
      errorMessage: "Max consensus rounds must be a positive integer or unlimited.",
    };
  }

  const modelNeedsCriteriaWeights = modelUsesCriteriaWeights(selectedModel);
  const expertWeightsValidationError = validateCreateIssueExpertWeights({
    selectedModel,
    selectedExperts,
    expertWeights: paramValues?.expertWeights,
  });

  if (expertWeightsValidationError) {
    return {
      ok: false,
      errorMessage: expertWeightsValidationError,
    };
  }

  if (modelNeedsCriteriaWeights) {
    if (!criteriaWeightingConfig || typeof criteriaWeightingConfig !== "object") {
      return {
        ok: false,
        errorMessage: "Criteria weighting configuration is required.",
      };
    }
  }

  if (
    modelNeedsCriteriaWeights &&
    criteriaWeightingConfig.mode ===
      CREATE_ISSUE_CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY
  ) {
    const fuzzyValueCount = resolveAssignedFuzzyValueCount({
      expressionDomainConfig,
      leafCriteria,
      globalDomains,
      expressionDomains,
    });
    const fuzzyValidationError = validateCreateIssueFuzzyCriteriaWeighting({
      criteriaWeightingConfig,
      leafCriteria,
      fuzzyValueCount,
    });
    if (fuzzyValidationError) {
      return {
        ok: false,
        errorMessage: fuzzyValidationError,
      };
    }
  }

  if (
    modelNeedsCriteriaWeights &&
    leafCriteria.length > 1 &&
    criteriaWeightingConfig.mode ===
      CREATE_ISSUE_CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL
  ) {
    const manualValidationError = validateCreateIssueManualCriteriaWeighting({
      criteriaWeightingConfig,
      leafCriteria,
    });
    if (manualValidationError) {
      return {
        ok: false,
        errorMessage: manualValidationError,
      };
    }
  }

  const issueInfoPayload = { ...allData };
  issueInfoPayload.isConsensus = modelRequiresConsensus;
  issueInfoPayload.simulateConsensus =
    modelRequiresConsensus &&
    modelSupportsConsensusSimulation &&
    simulateConsensus;
  if (modelRequiresConsensus) {
    issueInfoPayload.consensusThreshold = normalizedConsensusThreshold;
    issueInfoPayload.consensusMaxPhases = normalizedConsensusMaxPhases;
  }
  issueInfoPayload.paramValues = pruneCreateIssueParameterValues({
    selectedModel,
    values: paramValues,
  });
  issueInfoPayload.criteriaWeightingParameters = normalizeCriteriaWeightingParameters(
    criteriaWeightingConfig
  );

  return {
    ok: true,
    payload: {
      ...issueInfoPayload,
      selectedModelId: selectedModel?._id || null,
    },
  };
};
