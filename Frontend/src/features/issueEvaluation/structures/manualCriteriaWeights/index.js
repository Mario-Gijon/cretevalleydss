import { EVALUATION_STAGES } from "../../evaluation.constants";
import TollOutlinedIcon from "@mui/icons-material/TollOutlined";
import ManualCriteriaWeightsView from "./ManualCriteriaWeightsView";
import { manualCriteriaWeightsAdapter } from "./manualCriteriaWeights.adapter";

export const manualCriteriaWeightsStructure = Object.freeze({
  key: "manualCriteriaWeights",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  label: "Manual criteria weights",
  adapter: manualCriteriaWeightsAdapter,
  View: ManualCriteriaWeightsView,
  dialog: {
    icon: TollOutlinedIcon,
    title: "Criteria weights",
    maxWidth: "md",
    frame: "manualCriteriaWeights",
  },
});
