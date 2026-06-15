import { EVALUATION_STAGES } from "../../evaluation.constants";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import AlternativeCriteriaMatrixView from "./AlternativeCriteriaMatrixView";
import AlternativeCriteriaMatrixDialogFrame from "./AlternativeCriteriaMatrixDialogFrame";
import { alternativeCriteriaMatrixAdapter } from "./alternativeCriteriaMatrix.adapter";

export const alternativeCriteriaMatrixStructure = Object.freeze({
  key: "alternativeCriteriaMatrix",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  label: "Alternative-criteria matrix",
  adapter: alternativeCriteriaMatrixAdapter,
  View: AlternativeCriteriaMatrixView,
  DialogContentFrame: AlternativeCriteriaMatrixDialogFrame,
  dialog: {
    icon: TableChartOutlinedIcon,
    title: "Alternative evaluation",
    maxWidth: "lg",
    fullScreenOnMobile: true,
    showExpressionDomains: true,
    showCollectiveToggle: true,
    supportsPreparePayloadRead: true,
  },
});
