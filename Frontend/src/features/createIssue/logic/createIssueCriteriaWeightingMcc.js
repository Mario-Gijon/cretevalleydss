import { getLeafCriteria } from "../../../utils/criteria.utils";
import {
  CRITERIA_WEIGHTING_MODES,
  isManualCriteriaWeightingApiModel,
  normalizeMode,
} from "./createIssueCriteriaWeightingModes";
import {
  isFuzzyCriteriaWeightModel,
  modelUsesCriteriaWeights,
} from "./createIssueCriteriaWeighting";

export const resolveCriteriaWeightingMccAvailability = ({
  selectedModel,
  criteria,
  criteriaWeightingConfig,
  criteriaWeightingModels,
}) => {
  const leafCount = getLeafCriteria(Array.isArray(criteria) ? criteria : []).length;
  if (
    !modelUsesCriteriaWeights(selectedModel) ||
    isFuzzyCriteriaWeightModel(selectedModel) ||
    leafCount === 1
  ) {
    return false;
  }

  const mode = normalizeMode(criteriaWeightingConfig?.mode);
  const models = (Array.isArray(criteriaWeightingModels) ? criteriaWeightingModels : [])
    .filter((model) => model?.modelKind === "criteriaWeighting");
  const manualModel = models.find(isManualCriteriaWeightingApiModel);
  if (
    mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL ||
    mode === CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL
  ) {
    return manualModel?.supportsExpertCriteriaWeighting === true;
  }

  const modelId = String(criteriaWeightingConfig?.criteriaWeightingModelId || "").trim();
  const modelKey = String(criteriaWeightingConfig?.criteriaWeightingModelKey || "").trim();
  const selected = models.find((model) =>
    (modelId && String(model?._id || model?.id || "").trim() === modelId) ||
    (modelKey && String(model?.apiModelKey || "").trim() === modelKey)
  );

  return (
    selected?.supportsCreatorCriteriaWeighting === true &&
    selected?.supportsExpertCriteriaWeighting === true
  );
};
