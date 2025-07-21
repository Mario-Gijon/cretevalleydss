
import { DataGrid } from "@mui/x-data-grid";
import { Chip, Stack, useTheme } from "@mui/material";

export function MatrixAltPair({
  alternatives,
  evaluations,
  setEvaluations,
  collectiveEvaluations,
  permitEdit = true, // Por defecto es true si no se especifica
}) {
  const theme = useTheme();

  // Configuración de las columnas
  const columns = [
    { field: "id", headerName: "Alternatives", minWidth: 90, flex: 1 },
    ...alternatives.map((alt) => ({
      field: alt,
      headerName: alt,
      editable: permitEdit, // Aquí usamos permitEdit
      flex: 1,
      minWidth: 90,
      renderCell: (params) => {
        const rowId = params.row.id;
        const altCol = params.field;
        const userValue = parseFloat(params.value);
        const collectiveValue = parseFloat(
          collectiveEvaluations.find((r) => r.id === rowId)?.[altCol]
        );

        const isDiagonal = rowId === altCol;

        return (
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {isNaN(userValue) ? "" : userValue}
            {!isNaN(collectiveValue) && !isDiagonal && (
              <Chip
                label={collectiveValue}
                variant="outlined"
                size="small"
                sx={{
                  ml: 1.5,
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
    if (!permitEdit) return oldRow; // ⛔ Si no se permite edición, no hacer nada

    const changedField = Object.keys(newRow).find(
      (key) => key !== "id" && newRow[key] !== oldRow[key]
    );

    if (!changedField) return newRow;

    const updatedRow = { ...newRow };

    if (newRow.id === changedField) {
      updatedRow[changedField] = 0.5;
      setEvaluations(
        evaluations.map((row) => (row.id === updatedRow.id ? updatedRow : row))
      );
      return updatedRow;
    }

    let value = parseFloat(updatedRow[changedField]);

    if (isNaN(value) || value < 0 || value > 1) {
      updatedRow[changedField] = null;
      setEvaluations(
        evaluations.map((row) => {
          if (row.id === updatedRow.id) {
            return updatedRow;
          }
          if (row.id === changedField) {
            return { ...row, [updatedRow.id]: null };
          }
          return row;
        })
      );
    } else {
      const newValue = Math.round(value * 100) / 100;
      const inverseValue = Math.round((1 - newValue) * 100) / 100;

      setEvaluations(
        evaluations.map((row) => {
          if (!row || typeof row !== "object" || !row.id) return row;
          if (row.id === updatedRow.id) {
            return { ...updatedRow, [changedField]: newValue };
          }
          if (row.id === changedField) {
            return { ...row, [updatedRow.id]: inverseValue };
          }
          return row;
        })
      );

      updatedRow[changedField] = newValue;
    }

    return updatedRow;
  };

  return (
    <DataGrid
      rows={evaluations}
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
        if (params.row.id === params.field) return "diagonal-cell";
        return "grid-cell";
      }}
      sx={{
        "& .diagonal-cell": {
          backgroundColor: theme.palette.action.disabledBackground,
          color: theme.palette.text.disabled,
          fontWeight: "bold",
          pointerEvents: "none",
          cursor: "not-allowed",
        },
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
        bgcolor: theme.palette.background.default,
      }}
    />
  );
}
