import { EVALUATION_STAGES } from "../../evaluation.constants";
import TuneIcon from "@mui/icons-material/Tune";
import BestWorstCriteriaView from "./BestWorstCriteriaView";
import { bestWorstCriteriaAdapter } from "./bestWorstCriteria.adapter";

export const bestWorstCriteriaStructure = Object.freeze({
  key: "bestWorstCriteria",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  label: "BWM",
  adapter: bestWorstCriteriaAdapter,
  View: BestWorstCriteriaView,
  dialog: {
    icon: TuneIcon,
    title: "BWM",
    maxWidth: "md",
  },
});
