import { buildEqualWeightsByCriterion } from "./createIssueCriteriaWeightValues";

export const CRITERIA_WEIGHTING_MODES = Object.freeze({
  CREATOR_FUZZY: "creatorFuzzy",
  CREATOR_MANUAL: "creatorManual",
  EXPERT_MANUAL: "expertManual",
  CREATOR_API_MODEL: "creatorApiModel",
  EXPERT_API_MODEL: "expertApiModel",
});

export const MANUAL_CRITERIA_WEIGHTS_API_MODEL_KEY =
  "manual_criteria_weights";

export const normalizeMode = (mode) =>
  typeof mode === "string" && mode.trim()
    ? mode.trim()
    : CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL;

export const normalizeCriteriaWeightingLevel = (level) =>
  level === "parent" ? "parent" : "leaf";

export const isExpertCriteriaWeightingMode = (mode) => {
  const normalizedMode = normalizeMode(mode);
  return (
    normalizedMode === CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL ||
    normalizedMode === CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL
  );
};

export const resolveCriteriaWeightingLevel = ({ level } = {}) =>
  normalizeCriteriaWeightingLevel(level);

export const buildConfigByMode = ({ mode, leafCriteria, level }) => {
  const resolvedMode = normalizeMode(mode);

  if (resolvedMode === CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY) {
    return {
      mode: resolvedMode,
      source: "creator",
      method: "fuzzy",
      structureKey: null,
      level: resolveCriteriaWeightingLevel({ level }),
      payload: {},
    };
  }

  if (resolvedMode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL) {
    return {
      mode: resolvedMode,
      source: "creator",
      method: "manual",
      structureKey: "manualCriteriaWeights",
      level: resolveCriteriaWeightingLevel({ level }),
      payload: {
        weightsByCriterion: buildEqualWeightsByCriterion(leafCriteria),
      },
    };
  }

  return {
    mode: CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL,
    source: "experts",
    method: "manual",
    structureKey: "manualCriteriaWeights",
    criteriaWeightingModelKey: MANUAL_CRITERIA_WEIGHTS_API_MODEL_KEY,
    level: resolveCriteriaWeightingLevel({
      level,
      mode: CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL,
      source: "experts",
    }),
    payload: {},
  };
};

export const buildApiCriteriaWeightingConfig = ({
  mode,
  leafCriteria,
  criteriaWeightingModel,
  level,
}) => {
  void leafCriteria;
  const isCreatorMode = mode === CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL;
  const structureKey = String(
    criteriaWeightingModel?.evaluationStructureKey || ""
  ).trim();
  const modelId = String(
    criteriaWeightingModel?._id || criteriaWeightingModel?.id || ""
  ).trim();
  const modelKey = String(criteriaWeightingModel?.apiModelKey || "").trim();

  return {
    mode: isCreatorMode
      ? CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL
      : CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL,
    source: isCreatorMode ? "creator" : "experts",
    method: "apiModel",
    structureKey: structureKey || null,
    criteriaWeightingModelId: modelId || null,
    criteriaWeightingModelKey: modelKey || null,
    criteriaWeightingParameters: {},
    level: resolveCriteriaWeightingLevel({
      level,
      mode: isCreatorMode
        ? CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL
        : CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL,
      source: isCreatorMode ? "creator" : "experts",
    }),
    payload: {},
  };
};

export const isManualCriteriaWeightingApiModel = (criteriaWeightingModel) =>
  String(criteriaWeightingModel?.apiModelKey || "").trim() ===
  MANUAL_CRITERIA_WEIGHTS_API_MODEL_KEY;
