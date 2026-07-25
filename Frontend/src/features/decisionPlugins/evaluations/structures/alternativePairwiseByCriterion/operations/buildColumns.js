export const buildColumns = ({ alternatives, renderCell }) => {
  const alternativePositions = new Map(
    alternatives.map((alternative, index) => [alternative.id, index])
  );

  return [
    {
      field: "alternativeLabel",
      headerName: "Alternatives",
      minWidth: 150,
      flex: 1,
      sortable: false,
    },
    ...alternatives.map((columnAlternative) => ({
      field: columnAlternative.id,
      headerName: columnAlternative.name,
      minWidth: 150,
      flex: 1,
      sortable: false,
      renderCell: (params) => {
        const rowAlternativeId = params.row.id;
        const columnAlternativeId = columnAlternative.id;
        const rowIndex = alternativePositions.get(rowAlternativeId);
        const columnIndex = alternativePositions.get(columnAlternativeId);
        const diagonal = rowIndex === columnIndex;

        return renderCell({
          rowAlternativeId,
          columnAlternativeId,
          value: diagonal ? undefined : params.row[columnAlternativeId],
          diagonal,
          editable: rowIndex < columnIndex,
        });
      },
    })),
  ];
};
