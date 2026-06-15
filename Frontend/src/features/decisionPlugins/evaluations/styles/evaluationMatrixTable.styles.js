import { alpha } from "@mui/material/styles";

export const buildEvaluationMatrixDataGridSx = (theme) => ({
  width: "100%",
  maxWidth: "none",
  minWidth: 0,
  border: `1px solid ${alpha(theme.palette.common.white, 0.075)}`,
  backgroundColor: "rgba(5, 15, 28, 0.35)",
  "& .MuiDataGrid-main": {
    overflow: "hidden",
  },
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "rgba(8, 22, 36, 0.92)",
    color: theme.palette.text.primary,
    borderBottom: "1px solid rgba(75, 210, 207, 0.18)",
  },
  "& .MuiDataGrid-columnHeader": {
    borderRight: "1px solid rgba(255,255,255,0.075)",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontWeight: 800,
  },
  "& .MuiDataGrid-cell": {
    alignItems: "center",
    backgroundColor: "rgba(5, 15, 28, 0.35)",
    borderRight: "1px solid rgba(255,255,255,0.075)",
    borderBottom: "1px solid rgba(255,255,255,0.075)",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "transparent",
  },
  "& .MuiDataGrid-cell:hover": {
    backgroundColor: "transparent",
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
    outline: "none",
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
