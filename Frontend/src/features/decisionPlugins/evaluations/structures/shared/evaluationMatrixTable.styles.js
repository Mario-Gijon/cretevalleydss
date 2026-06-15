import { alpha } from "@mui/material/styles";

const headerBg = "#0c0c0c";
const bodyCellBg = "#11111128";
const diagonalCellBg = "#000000";
const cellBorder = "1px solid rgba(255,255,255,0.075)";

export const buildEvaluationMatrixDataGridSx = (theme) => ({
  width: "100%",
  maxWidth: "none",
  minWidth: 0,
  border: `1px solid ${alpha(theme.palette.common.white, 0.075)}`,
  backgroundColor: bodyCellBg,

  "& .MuiDataGrid-main": {
    overflow: "hidden",
    backgroundColor: bodyCellBg,
  },

  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: headerBg,
    borderBottom: cellBorder,
  },

  "& .MuiDataGrid-columnHeader": {
    backgroundColor: headerBg,
    borderRight: cellBorder,
  },

  "& .MuiDataGrid-columnHeader:last-of-type": {
    borderRight: "none",
  },

  "& .MuiDataGrid-columnHeaderTitle": {
    fontWeight: 800,
    color: theme.palette.text.primary,
  },

  "& .MuiDataGrid-cell": {
    alignItems: "center",
    backgroundColor: bodyCellBg,
    borderRight: cellBorder,
    borderBottom: cellBorder,
  },

  "& .MuiDataGrid-cell:last-of-type": {
    borderRight: "none",
  },

  "& .MuiDataGrid-row": {
    backgroundColor: bodyCellBg,
  },

  "& .MuiDataGrid-row:hover": {
    backgroundColor: bodyCellBg,
  },

  "& .MuiDataGrid-row:hover .MuiDataGrid-cell": {
    backgroundColor: bodyCellBg,
  },

  "& .MuiDataGrid-cell:hover": {
    backgroundColor: bodyCellBg,
  },

  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
    outline: "none",
  },

  // Primera columna como cabecera lateral de la matriz
  "& .MuiDataGrid-cell[data-field='id']": {
    backgroundColor: headerBg,
    fontWeight: 800,
  },

  "& .MuiDataGrid-row:hover .MuiDataGrid-cell[data-field='id']": {
    backgroundColor: headerBg,
  },

  "& .first-column": {
    backgroundColor: headerBg,
    fontWeight: 800,
  },

  "& .MuiDataGrid-row:hover .first-column": {
    backgroundColor: headerBg,
  },

  // Diagonal en matrices pairwise
  "& .diagonal-cell": {
    backgroundColor: diagonalCellBg,
    color: theme.palette.text.disabled,
    fontWeight: 800,
    pointerEvents: "none",
    cursor: "not-allowed",
  },

  "& .MuiDataGrid-row:hover .diagonal-cell": {
    backgroundColor: diagonalCellBg,
  },

  "& .MuiDataGrid-iconButtonContainer": {
    display: "none",
  },

  "& .MuiDataGrid-sortIcon": {
    display: "none",
  },

  "& .MuiDataGrid-withBorderColor": {
    borderColor: "rgba(255,255,255,0.075)",
  },
});