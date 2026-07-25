import { Box, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import { buildEvaluationMatrixDataGridSx } from "../../../shared/evaluationMatrixTable.styles";
import Cell from "./Cell";
import {
  buildPairwiseMatrixSx,
  pairwiseMatrixSx,
} from "./PairwiseMatrix.styles";
import { buildColumns } from "../operations/buildColumns";
import { buildRows } from "../operations/buildRows";

const PairwiseMatrix = ({
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
        permitEdit={permitEdit}
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
    <Box sx={pairwiseMatrixSx.container}>
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
        sx={buildPairwiseMatrixSx({
          theme,
          alternativeCount: alternatives.length,
          buildSharedStyles: buildEvaluationMatrixDataGridSx,
        })}
      />
    </Box>
  );
};

export default PairwiseMatrix;
