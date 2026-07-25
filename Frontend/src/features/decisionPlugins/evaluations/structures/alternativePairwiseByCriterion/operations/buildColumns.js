export const buildColumns = ({ alternatives, renderCell }) => {
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
