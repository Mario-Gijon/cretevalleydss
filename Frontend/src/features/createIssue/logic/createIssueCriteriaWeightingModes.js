import { buildEqualWeightsByCriterion } from "./createIssueCriteriaWeightValues";

export const CRITERIA_WEIGHTING_MODES = Object.freeze({
  CREATOR_FUZZY: "creatorFuzzy",
  CREATOR_MANUAL: "creatorManual",
  EXPERT_MANUAL: "expertManual",
  CREATOR_API_MODEL: "creatorApiModel",
  EXPERT_API_MODEL: "expertApiModel",
});

export const normalizeMode = (mode) =>
  typeof mode === "string" && mode.trim()
    ? mode.trim()
    : CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL;

export const buildConfigByMode = ({ mode, leafCriteria }) => {
  const resolvedMode = normalizeMode(mode);

  if (resolvedMode === CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY) {
    return {
      mode: resolvedMode,
      source: "creator",
      method: "fuzzy",
      structureKey: null,
      payload: {},
    };
  }

  if (resolvedMode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL) {
    return {
      mode: resolvedMode,
      source: "creator",
      method: "manual",
      structureKey: "manualCriteriaWeights",
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
    payload: {},
  };
};

export const buildApiCriteriaWeightingConfig = ({
  mode,
  leafCriteria,
  criteriaWeightingModel,
}) => {
  void leafCriteria;
  const isCreatorMode = mode === CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL;
  const structureKey = String(
    criteriaWeightingModel?.criteriaWeightingStructureKey || ""
  ).trim();
  const modelId = String(criteriaWeightingModel?._id || criteriaWeightingModel?.id || "").trim();
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
    payload: {},
  };
};
