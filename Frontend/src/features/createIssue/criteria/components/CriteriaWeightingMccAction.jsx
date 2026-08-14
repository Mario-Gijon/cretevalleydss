import { useMemo } from "react";
import { ToggleButton } from "@mui/material";

import { getLeafCriteria } from "../../../../utils/criteria.utils";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import {
  CRITERIA_WEIGHTING_MODES,
  buildApiCriteriaWeightingConfig,
  buildConfigByMode,
  isManualCriteriaWeightingApiModel,
  normalizeMode,
} from "../../logic/createIssueCriteriaWeightingModes";
import {
  buildCriteriaWeightingDecisionContext,
  buildCreatorCriteriaWeightingInitialization,
} from "../../logic/createIssueCriteriaWeightingInitialization";
import { resolveCriteriaWeightingMccAvailability } from "../../logic/createIssueCriteriaWeightingMcc";
import { EVALUATION_STAGES } from "../../../decisionPlugins/evaluations/evaluationStages";
import { getEvaluationStructureEntryForStage } from "../../../decisionPlugins/evaluations/evaluationStructureRegistry";

const actionSx = {
  px: 1.4,
  py: 0.55,
  fontWeight: "fontWeightBold",
  typography: "caption",
  letterSpacing: 0.25,
  textTransform: "uppercase",
  "&.Mui-selected": {
    color: "info.main",
    backgroundColor: "rgba(75, 210, 207, 0.10)",
  },
  "&.Mui-selected:hover": {
    backgroundColor: "rgba(75, 210, 207, 0.14)",
  },
};

export const CriteriaWeightingMccAction = ({
  selectedModel,
  criteria,
  criteriaWeightingConfig,
  setCriteriaWeightingConfig,
  setDefaultModelParams,
}) => {
  const { criteriaWeightingModels } = useIssuesDataContext();
  const leafCriteria = useMemo(
    () => getLeafCriteria(Array.isArray(criteria) ? criteria : []),
    [criteria]
  );
  const mode = normalizeMode(criteriaWeightingConfig?.mode);
  const models = useMemo(
    () => (Array.isArray(criteriaWeightingModels) ? criteriaWeightingModels : [])
      .filter((model) => model?.modelKind === "criteriaWeighting"),
    [criteriaWeightingModels]
  );
  const manualModel = models.find(isManualCriteriaWeightingApiModel);
  const selectedApiModel = models.find((model) =>
    (String(criteriaWeightingConfig?.criteriaWeightingModelId || "").trim() &&
      String(model?._id || model?.id || "").trim() ===
        String(criteriaWeightingConfig?.criteriaWeightingModelId || "").trim()) ||
    (String(criteriaWeightingConfig?.criteriaWeightingModelKey || "").trim() &&
      String(model?.apiModelKey || "").trim() ===
        String(criteriaWeightingConfig?.criteriaWeightingModelKey || "").trim())
  );
  const isManual =
    mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL ||
    mode === CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL;
  const supportsBoth = isManual
    ? manualModel?.supportsExpertCriteriaWeighting === true
    : selectedApiModel?.supportsCreatorCriteriaWeighting === true &&
      selectedApiModel?.supportsExpertCriteriaWeighting === true;
  const available = resolveCriteriaWeightingMccAvailability({
    selectedModel,
    criteria,
    criteriaWeightingConfig,
    criteriaWeightingModels,
  });
  if (!available || !supportsBoth) return null;

  const active =
    mode === CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL ||
    mode === CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL;
  const updateConfig = (nextConfig) => {
    setDefaultModelParams?.(false);
    setCriteriaWeightingConfig?.(nextConfig);
  };
  const creatorApiConfig = () => {
    const structureEntry = getEvaluationStructureEntryForStage({
      structureKey: selectedApiModel?.evaluationStructureKey || "",
      stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
    });
    const decisionContext = buildCriteriaWeightingDecisionContext({
      criteriaWeightingModel: selectedApiModel,
      structureEntry,
      criteriaTree: criteria,
      leafCriteria,
    });
    const initialization = buildCreatorCriteriaWeightingInitialization({
      criteriaWeightingModel: selectedApiModel,
      structureEntry,
      decisionContext,
    });
    return {
      ...buildApiCriteriaWeightingConfig({
        mode: CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL,
        leafCriteria,
        criteriaWeightingModel: selectedApiModel,
      }),
      payload: initialization.evaluation,
      initializationIdentity: initialization.initializationIdentity,
    };
  };

  return (
    <ToggleButton
      value="mccExpertsConsensus"
      selected={active}
      size="small"
      color="info"
      onClick={() => {
        if (isManual) {
          updateConfig(
            buildConfigByMode({
              mode: active
                ? CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL
                : CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL,
              leafCriteria,
            })
          );
        } else if (selectedApiModel) {
          updateConfig(
            active
              ? creatorApiConfig()
              : buildApiCriteriaWeightingConfig({
                  mode: CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL,
                  leafCriteria,
                  criteriaWeightingModel: selectedApiModel,
                })
          );
        }
      }}
      sx={{
        ...actionSx,
        borderColor: active
          ? "rgba(75, 210, 207, 0.72)"
          : "rgba(255,255,255,0.16)",
        color: active ? "info.main" : "text.secondary",
      }}
    >
      MCC EXPERTS CONSENSUS
    </ToggleButton>
  );
};

export default CriteriaWeightingMccAction;
