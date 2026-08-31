import {
  ALTERNATIVE_CRITERIA_LABEL_COLUMN_MIN_WIDTH,
  EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH,
} from "../../../shared/evaluationMatrixSizing.js";

export const buildColumns = ({
  criteria,
  renderCell,
}) => [
  {
    field: "alternativeLabel",
    headerName: "Alternative/Criterion",
    minWidth: ALTERNATIVE_CRITERIA_LABEL_COLUMN_MIN_WIDTH,
    flex: 1,
  },
  ...criteria.map((criterion) => ({
    field: criterion.id,
    headerName: criterion.name,
    flex: 1,
    minWidth: EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH,
    renderCell: (params) =>
      renderCell({
        rowId: params.row.id,
        criterion,
        value: params.row[criterion.id],
      }),
  })),
];
