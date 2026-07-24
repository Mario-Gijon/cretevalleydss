export const buildColumns = ({
  criteria,
  renderCell,
}) => [
  {
    field: "alternativeLabel",
    headerName: "Alternative/Criterion",
    minWidth: 120,
    flex: 1,
  },
  ...criteria.map((criterion) => ({
    field: criterion.id,
    headerName: criterion.name,
    flex: 1,
    minWidth: 120,
    renderCell: (params) =>
      renderCell({
        rowId: params.row.id,
        criterion,
        value: params.row[criterion.id],
      }),
  })),
];
