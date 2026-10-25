import { alpha } from "@mui/material/styles";
import { decisionMatrixSurface } from "../../../shared/styles/decisionMatrixSurface.styles.js";

const { headerBackground: headerBg, cellBackground, cellBorder } = decisionMatrixSurface;
export const evaluationMatrixCellBackground = cellBackground;
const diagonalCellBg = "#000000";

export const evaluationMatrixInputBoundarySx = {
  "& .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
    borderColor: "transparent",
  },
  "& .MuiInputBase-input.Mui-disabled, & .MuiSelect-select.Mui-disabled": {
    color: "text.secondary",
    WebkitTextFillColor: "currentColor",
  },
};

export const buildEvaluationMatrixDataGridSx = (theme) => ({
  width: "100%", maxWidth: "none", minWidth: 0, border: `1px solid ${alpha(theme.palette.common.white, 0.075)}`, backgroundColor: evaluationMatrixCellBackground,
  "& .MuiDataGrid-main": { overflow: "hidden", backgroundColor: evaluationMatrixCellBackground },
  "& .MuiDataGrid-columnHeaders": { backgroundColor: headerBg, borderBottom: cellBorder },
  "& .MuiDataGrid-columnHeader": { backgroundColor: headerBg, borderRight: cellBorder },
  "& .MuiDataGrid-columnHeader:last-of-type": { borderRight: "none" },
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 800, color: theme.palette.text.primary },
  "& .MuiDataGrid-cell": { alignItems: "center", boxSizing: "border-box", backgroundColor: evaluationMatrixCellBackground, borderRight: cellBorder, borderBottom: cellBorder, backgroundClip: "padding-box" },
  "& .MuiDataGrid-cell:last-of-type": { borderRight: "none" },
  "& .MuiDataGrid-row": { backgroundColor: evaluationMatrixCellBackground },
  "& .MuiDataGrid-row:hover": { backgroundColor: evaluationMatrixCellBackground },
  "& .MuiDataGrid-row:hover .MuiDataGrid-cell": { backgroundColor: evaluationMatrixCellBackground },
  "& .MuiDataGrid-cell:hover": { backgroundColor: evaluationMatrixCellBackground },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": { outline: "none" },
  "& .MuiDataGrid-cell[data-field='id']": { backgroundColor: headerBg, fontWeight: 800 },
  "& .MuiDataGrid-row:hover .MuiDataGrid-cell[data-field='id']": { backgroundColor: headerBg },
  "& .MuiDataGrid-cell[data-field='alternativeLabel']": { backgroundColor: headerBg, fontWeight: 800 },
  "& .MuiDataGrid-row:hover .MuiDataGrid-cell[data-field='alternativeLabel']": { backgroundColor: headerBg },
  "& .first-column": { backgroundColor: headerBg, fontWeight: 800 },
  "& .MuiDataGrid-row:hover .first-column": { backgroundColor: headerBg },
  "& .diagonal-cell": { backgroundColor: diagonalCellBg, color: theme.palette.text.disabled, fontWeight: 800, pointerEvents: "none", cursor: "not-allowed" },
  "& .MuiDataGrid-row:hover .diagonal-cell": { backgroundColor: diagonalCellBg },
  "& .MuiDataGrid-iconButtonContainer": { display: "none" },
  "& .MuiDataGrid-sortIcon": { display: "none" },
  "& .MuiDataGrid-withBorderColor": { borderColor: "rgba(255,255,255,0.075)" },
});
