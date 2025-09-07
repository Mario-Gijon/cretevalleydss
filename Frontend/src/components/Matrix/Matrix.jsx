import { DataGrid } from "@mui/x-data-grid";
import { Chip, Stack, useTheme } from "@mui/material";

export const Matrix = ({ alternatives, criteria, evaluations, setEvaluations, collectiveEvaluations, permitEdit = true }) => {

  const theme = useTheme();

  // Configuración de las columnas: la primera columna es "Alternatives", luego cada criterio
  const columns = [
    { field: "id", headerName: "Alternative/Criterion", minWidth: 120, flex: 1 },
    ...criteria.map((criterion) => ({
      field: criterion, // 👈 aquí va el nombre del criterio como key única
      headerName: criterion,
      editable: permitEdit,
      flex: 1,
      minWidth: 100,
      renderCell: (params) => {
        const rowId = params.row.id; // alternativa
        const criterion = params.field; // criterio actual
        const userValue = parseFloat(params.value);
        const collectiveValue = parseFloat(
          collectiveEvaluations?.find((r) => r.id === rowId)?.[criterion]
        );

        return (
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {isNaN(userValue) ? "" : userValue}
            {!isNaN(collectiveValue) && (
              <Chip
                label={collectiveValue}
                variant="outlined"
                size="small"
                sx={{
                  ml: 1,
                  fontSize: "0.75rem",
                  height: 20,
                  pointerEvents: "none",
                }}
              />
            )}
          </Stack>
        );
      },
    })),
  ];

  const handleProcessRowUpdate = (newRow, oldRow) => {
    if (!permitEdit) return oldRow;

    const changedField = Object.keys(newRow).find(
      (key) => key !== "id" && newRow[key] !== oldRow[key]
    );

    if (!changedField) return newRow;

    const updatedRow = { ...newRow };
    let value = parseFloat(updatedRow[changedField]);

    if (isNaN(value) || value < 0 || value > 1) {
      updatedRow[changedField] = null;
    } else {
      updatedRow[changedField] = Math.round(value * 100) / 100;
    }

    // Actualizar evaluaciones globales
    setEvaluations((prev) => ({
      ...prev,
      [updatedRow.id]: {
        ...(prev[updatedRow.id] || {}),
        [changedField]: updatedRow[changedField],
      },
    }));

    return updatedRow;
  };

  // Prepara las filas con alternativas como id y valores de evaluaciones
  const rows = alternatives.map((alt) => ({
    id: alt,
    ...(evaluations[alt] || {}),
  }));

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      disableColumnMenu
      hideFooter
      disableColumnFilter
      disableColumnSorting
      disableSelectionOnClick
      processRowUpdate={handleProcessRowUpdate}
      experimentalFeatures={{ newEditingApi: true }}
      disableRowSelectionOnClick
      disableColumnSelector
      density="compact"
      getCellClassName={(params) => {
        if (params.field === "id") return "first-column";
        return "grid-cell";
      }}
      sx={{
        "& .MuiDataGrid-row:hover": { backgroundColor: "transparent" },
        "& .MuiDataGrid-cell:hover": { backgroundColor: "transparent" },
        "& .first-column": {
          borderRight: `2px solid ${theme.palette.divider}`,
          fontWeight: "bold",
        },
        "& .grid-cell": {
          borderRight: `1px solid ${theme.palette.divider}`,
          borderBottom: `1px solid ${theme.palette.divider}`,
        },
        maxWidth: "100%",
        minWidth: "60%",
        backgroundColor: "rgba(5, 41, 55, 0.01)",
        '& .MuiDataGrid-withBorderColor': {
          backgroundColor: 'rgba(1, 12, 29, 0.8)', // fondo del datagrid
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          fontWeight: 'bold',
        },
      }}
    />
  );
};