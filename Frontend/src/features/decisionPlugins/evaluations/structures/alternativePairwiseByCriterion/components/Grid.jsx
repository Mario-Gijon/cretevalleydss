import { Box, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import { buildEvaluationMatrixDataGridSx } from "../../../shared/evaluationMatrixTable.styles";
import Cell from "./Cell";
import { buildGridSx, gridSx } from "./Grid.styles";
import { buildColumns } from "../operations/buildColumns";
import { buildRows } from "../operations/buildRows";

const Grid = ({
  alternatives,
  evaluation,
  collectiveEvaluation,
  expressionDomain,
  permitEdit,
  onChange,
}) => {
  const theme = useTheme();
  const rows = buildRows({
    alternatives,
    evaluation,
  });
  const columns = buildColumns({
    alternatives,
    renderCell: ({
      rowAlternativeId,
      columnAlternativeId,
      value,
      diagonal,
      editable,
    }) => (
      <Cell
        value={value}
        collectiveValue={
          diagonal
            ? undefined
            : collectiveEvaluation?.[rowAlternativeId]?.[columnAlternativeId]
        }
        expressionDomain={expressionDomain}
        diagonal={diagonal}
        editable={editable}
        permitEdit={permitEdit}
        error=""
        onChange={(nextValue) =>
          onChange({
            rowAlternativeId,
            columnAlternativeId,
            nextValue,
          })
        }
      />
    ),
  });

  return (
    <Box sx={gridSx.container}>
      <DataGrid
        autoHeight
        rows={rows}
        columns={columns}
        density="compact"
        hideFooter
        disableColumnMenu
        disableColumnFilter
        disableColumnSorting
        disableColumnSelector
        disableRowSelectionOnClick
        getRowId={(row) => row.id}
        getCellClassName={(params) => {
          if (params.field === "alternativeLabel") {
            return "first-column";
          }

          return params.row.id === params.field
            ? "diagonal-cell"
            : "pairwise-grid-cell";
        }}
        sx={buildGridSx({
          theme,
          alternativeCount: alternatives.length,
          buildSharedStyles: buildEvaluationMatrixDataGridSx,
        })}
      />
    </Box>
  );
};

export default Grid;
