import { DataGrid } from "@mui/x-data-grid";
import { Chip, MenuItem, Select, Stack, useTheme } from "@mui/material";

/**
 * Matriz de evaluación directa alternativa x criterio.
 *
 * @param {Object} props
 * @param {string[]} props.alternatives
 * @param {string[]} props.criteria
 * @param {Object} props.evaluations
 * @param {Function} props.setEvaluations
 * @param {Object} props.collectiveEvaluations
 * @param {boolean} [props.permitEdit=true]
 * @returns {JSX.Element}
 */
const DirectEvaluationMatrix = ({
  alternatives,
  criteria,
  evaluations,
  setEvaluations,
  collectiveEvaluations,
  permitEdit = true,
}) => {
  const theme = useTheme();

  console.log(evaluations)

  const getDomain = (cell) =>
    cell && typeof cell === "object" && cell.domain ? cell.domain : null;

  const getValue = (cell) =>
    cell && typeof cell === "object" ? cell.value : cell;

  const columns = [
    {
      field: "id",
      headerName: "Alternative/Criterion",
      minWidth: 120,
      flex: 1,
    },
    ...criteria.map((criterion) => ({
      field: criterion,
      headerName: criterion,
      editable: permitEdit,
      flex: 1,
      minWidth: 120,
      valueGetter: (params) => {
        const cell = params.row?.[criterion];
        if (!cell) return "";
        return typeof cell === "object" ? cell.value ?? "" : cell;
      },
      renderCell: (params) => {
        const rowId = params.row.id;
        const critName = params.field;
        const cell = evaluations?.[rowId]?.[critName];

        if (cell == null) {
          return "";
        }

        const domain = getDomain(cell);
        const value = getValue(cell);

        if (typeof value === "number") {
          const userValue = value;
          const collectiveValue = parseFloat(
            collectiveEvaluations?.[rowId]?.[critName]?.value
          );

          return (
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              {userValue !== null && userValue !== "" ? userValue : ""}
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
                  color="info"
                />
              )}
            </Stack>
          );
        }

        if (domain?.type === "linguistic") {
          return (
            <Select
              size="small"
              fullWidth
              color="secondary"
              value={value || ""}
              onChange={(event) => {
                const newValue = event.target.value;

                setEvaluations((prev) => ({
                  ...prev,
                  [rowId]: {
                    ...(prev[rowId] || {}),
                    [critName]: { value: newValue, domain },
                  },
                }));
              }}
              sx={{ minWidth: 120 }}
            >
              {(domain.labels || []).map((label, index) => (
                <MenuItem key={index} value={label.label}>
                  {label.label}
                </MenuItem>
              ))}
            </Select>
          );
        }

        return <span>{value ?? ""}</span>;
      },
    })),
  ];

  const handleProcessRowUpdate = (newRow, oldRow) => {
    if (!permitEdit) {
      return oldRow;
    }

    const changedField = Object.keys(newRow).find(
      (key) =>
        key !== "id" &&
        JSON.stringify(newRow[key]) !== JSON.stringify(oldRow[key])
    );

    if (!changedField) {
      return newRow;
    }

    const prevCell = oldRow[changedField];
    const prevDomain = getDomain(prevCell);
    const raw = newRow[changedField];

    let nextCell;

    if (prevDomain?.type === "numeric") {
      const rawValue = getValue(raw);
      const numericValue = parseFloat(rawValue);
      const min = prevDomain.range?.min ?? 0;
      const max = prevDomain.range?.max ?? 1;

      if (
        Number.isNaN(numericValue) ||
        numericValue < min ||
        numericValue > max
      ) {
        nextCell = { value: "", domain: prevDomain };
      } else {
        nextCell = {
          value: Math.round(numericValue * 100) / 100,
          domain: prevDomain,
        };
      }
    } else if (prevDomain?.type === "linguistic") {
      const rawValue = getValue(raw) ?? "";
      nextCell = { value: rawValue, domain: prevDomain };
    } else {
      nextCell = raw;
    }

    const resultRow = { ...newRow, [changedField]: nextCell };

    setEvaluations((prev) => ({
      ...prev,
      [resultRow.id]: {
        ...(prev[resultRow.id] || {}),
        [changedField]: nextCell,
      },
    }));

    return resultRow;
  };

  const rows = alternatives.map((alternative) => {
    const row = { id: alternative };

    criteria.forEach((criterion) => {
      row[criterion] =
        evaluations[alternative]?.[criterion] ?? { value: "", domain: null };
    });

    return row;
  });

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
        if (params.field === "id") {
          return "first-column";
        }

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
          px: 2,
          textAlign: "center",
        },
        maxWidth: "100%",
        minWidth: "60%",
        backgroundColor: "rgba(5, 41, 55, 0.01)",
        "& .MuiDataGrid-withBorderColor": {
          backgroundColor: "rgba(1, 12, 29, 0.8)",
          backdropFilter: "blur(15px)",
          WebkitBackdropFilter: "blur(15px)",
          fontWeight: "bold",
        },
      }}
    />
  );
};

export default DirectEvaluationMatrix;