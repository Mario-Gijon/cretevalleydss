import { alpha } from "@mui/material/styles";
import { decisionMatrixSurface } from "../../../../shared/styles/decisionMatrixSurface.styles";
import { evaluationMatrixInputBoundarySx } from "../../../shared/styles/evaluationMatrixTable.styles.js";
import { EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH } from "../../../shared/evaluationMatrixSizing.js";

const CRITERIA_PAIRWISE_LABEL_COLUMN_MIN_WIDTH = 180;

export const criteriaPairwiseAHPViewSx = {
  container: { minWidth: 0, width: "100%", gap: 1.1 },
  matrixViewport: {
    width: "100%",
    minWidth: 0,
    overflowX: "auto",
    overscrollBehaviorX: "contain",
    borderRadius: 1.5,
  },
  empty: { color: "text.secondary", py: 1 },
  caption: { color: "text.secondary", display: "block" },
  status: { color: "text.secondary", fontWeight: 700 },
};

export const buildCriteriaPairwiseAHPGridSx = (theme, criterionCount) => ({
  width: "100%",
  minWidth: `${CRITERIA_PAIRWISE_LABEL_COLUMN_MIN_WIDTH + Math.max(criterionCount, 1) * EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH}px`,
  ...{
    "& .MuiDataGrid-cell[data-field='criterionLabel']": {
      backgroundColor: decisionMatrixSurface.headerBackground,
      fontWeight: 800,
    },
    "& .MuiDataGrid-row:hover .MuiDataGrid-cell[data-field='criterionLabel']": {
      backgroundColor: decisionMatrixSurface.headerBackground,
    },
    "& .MuiDataGrid-columnHeader[data-field='criterionLabel']": {
      backgroundColor: decisionMatrixSurface.headerBackground,
    },
  },
  "& .MuiDataGrid-cell": { px: 0.8, py: 0.4 },
  "& .MuiDataGrid-columnHeaderTitle": {
    whiteSpace: "normal",
    lineHeight: 1.15,
    textAlign: "center",
  },
  "& .MuiDataGrid-cell[data-field='criterionLabel'] .MuiTypography-root": {
    overflowWrap: "anywhere",
  },
  "& .derived-cell": {
    backgroundColor: alpha(theme.palette.secondary.main, 0.035),
  },
});

export const judgmentCellSx = {
  control: {
    minWidth: 0,
    width: "100%",
    ...evaluationMatrixInputBoundarySx,
    "& .MuiOutlinedInput-root": {
      height: 34,
      bgcolor: "rgba(5, 12, 20, 0.52)",
      "& fieldset": { borderColor: "rgba(255,255,255,0.10)" },
      "&:hover fieldset": { borderColor: "secondary.main" },
      "&.Mui-focused fieldset": { borderColor: "secondary.main" },
      "&.Mui-error fieldset": { borderColor: "error.main" },
    },
    "& .MuiOutlinedInput-input": {
      px: 0.8,
      py: 0.5,
      textAlign: "center",
      fontWeight: 800,
    },
  },
  value: { color: "text.primary", fontWeight: 800, textAlign: "center" },
  fixed: {
    display: "grid",
    placeItems: "center",
    width: "100%",
    minHeight: 32,
    color: "text.secondary",
    bgcolor: "rgba(0,0,0,0.45)",
    borderRadius: 1,
    fontWeight: 800,
  },
  derived: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    minHeight: 34,
    opacity: 0.78,
  },
  readOnly: {
    display: "grid",
    placeItems: "center",
    width: "100%",
    minHeight: 34,
  },
};

export const collectiveResultSx = {
  container: {
    p: 1.2,
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 1.5,
    bgcolor: "rgba(255,255,255,0.018)",
  },
  heading: { fontWeight: 850 },
  subheading: { color: "text.secondary", fontWeight: 800 },
  weightRow: {
    borderBottom: "1px solid rgba(255,255,255,0.055)",
    pb: 0.35,
  },
  criterionName: { color: "text.primary", minWidth: 0, overflowWrap: "anywhere" },
  weight: { color: "secondary.light", fontWeight: 850, whiteSpace: "nowrap" },
  divider: { borderColor: "rgba(255,255,255,0.09)", my: 0.1 },
  expertAccordion: {
    border: "1px solid rgba(255,255,255,0.075)",
    borderRadius: "8px !important",
    bgcolor: "rgba(4, 12, 20, 0.52)",
    "&::before": { display: "none" },
    "& .MuiAccordionSummary-root": { minHeight: 38, px: 1 },
    "& .MuiAccordionSummary-content": { my: 0.55 },
    "& .MuiAccordionDetails-root": { pt: 0, px: 1.2, pb: 1 },
  },
  expertName: { fontWeight: 800, overflowWrap: "anywhere" },
  expertStatus: { color: "text.secondary" },
  diagnosticLine: { color: "text.secondary", mb: 0.25 },
  aggregation: { color: "text.secondary", pt: 0.3 },
};
