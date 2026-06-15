import { EVALUATION_STAGES } from "../../evaluation.constants";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import AlternativePairwiseByCriterionView from "./AlternativePairwiseByCriterionView";
import AlternativePairwiseByCriterionDialogFrame from "./AlternativePairwiseByCriterionDialogFrame";
import { alternativePairwiseByCriterionAdapter } from "./alternativePairwiseByCriterion.adapter";

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: "alternativePairwiseByCriterion",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  label: "Pairwise alternatives by criterion",
  adapter: alternativePairwiseByCriterionAdapter,
  View: AlternativePairwiseByCriterionView,
  DialogContentFrame: AlternativePairwiseByCriterionDialogFrame,
  dialog: {
    icon: GridOnOutlinedIcon,
    title: "Alternative evaluation",
    maxWidth: "lg",
    showExpressionDomains: true,
    showCollectiveToggle: true,
  },
});
