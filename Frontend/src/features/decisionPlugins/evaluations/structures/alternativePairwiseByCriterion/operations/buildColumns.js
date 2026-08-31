import {
  ALTERNATIVE_PAIRWISE_LABEL_COLUMN_MIN_WIDTH,
  EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH,
} from "../../../shared/evaluationMatrixSizing.js";

export const buildColumns = ({ alternatives, renderCell }) => {
  return [
    {
      field: "alternativeLabel",
      headerName: "Alternatives",
      minWidth: ALTERNATIVE_PAIRWISE_LABEL_COLUMN_MIN_WIDTH,
      flex: 1,
      sortable: false,
    },
    ...alternatives.map((columnAlternative) => ({
      field: columnAlternative.id,
      headerName: columnAlternative.name,
      minWidth: EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH,
      flex: 1,
      sortable: false,
      renderCell: (params) => {
        const rowAlternativeId = params.row.id;
        const columnAlternativeId = columnAlternative.id;
        const diagonal = rowAlternativeId === columnAlternativeId;

        return renderCell({
          rowAlternativeId,
          columnAlternativeId,
          value: diagonal ? undefined : params.row[columnAlternativeId],
          diagonal,
        });
      },
    })),
  ];
};
