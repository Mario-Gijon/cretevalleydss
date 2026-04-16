import { DataGrid } from "@mui/x-data-grid";
import { Chip, Stack, useTheme } from "@mui/material";

const getCellValue = (cell) => {
  if (cell === "" || cell == null) {
    return null;
  }

  if (typeof cell === "object" && !Array.isArray(cell) && "value" in cell) {
    if (cell.value === "" || cell.value == null) {
      return null;
    }

    return cell.value;
  }

  return cell;
};

const getCellNumericValue = (cell) => {
  const rawValue = getCellValue(cell);

  if (rawValue === "" || rawValue == null) {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const getCellDomain = (cell) => {
  if (cell && typeof cell === "object" && "domain" in cell) {
    return cell.domain || null;
  }

  return null;
};

const getCellRange = (cell) => {
  const domain = getCellDomain(cell);
  const min = Number(domain?.range?.min);
  const max = Number(domain?.range?.max);

  if (Number.isFinite(min) && Number.isFinite(max) && min < max) {
    return { min, max };
  }

  return { min: 0, max: 1 };
};

const round2 = (value) => Math.round(value * 100) / 100;

const normalizeToUnit = (value, min, max) => {
  if (max === min) return 0;
  return (value - min) / (max - min);
};

const denormalizeFromUnit = (normalizedValue, min, max) => {
  return min + normalizedValue * (max - min);
};

const getExpectedInverseValue = ({ value, sourceRange, targetRange }) => {
  const normalized = normalizeToUnit(value, sourceRange.min, sourceRange.max);
  const inverseNormalized = 1 - normalized;

  return round2(
    denormalizeFromUnit(
      inverseNormalized,
      targetRange.min,
      targetRange.max
    )
  );
};

const preserveCellShape = (previousCell, nextValue) => {
  if (
    previousCell &&
    typeof previousCell === "object" &&
    !Array.isArray(previousCell)
  ) {
    return {
      ...previousCell,
      value: nextValue,
      isNeutralFallback: false,
    };
  }

  return nextValue;
};

const shouldShowNeutralFallback = (cell, isDiagonal) => {
  return Boolean(isDiagonal && cell?.isNeutralFallback);
};

/**
 * Matriz de comparación por pares entre alternativas.
 *
 * Actualmente está preparada para dominios numéricos pairwise
 * y usa el rango del dominio para:
 * - validar el valor introducido,
 * - fijar la recíproca,
 * - mantener la diagonal bloqueada.
 *
 * @param {Object} props
 * @param {string[]} props.alternatives
 * @param {Object[]} props.evaluations
 * @param {Function} props.setEvaluations
 * @param {Object[]} [props.collectiveEvaluations=[]]
 * @param {boolean} [props.permitEdit=true]
 * @returns {JSX.Element}
 */
const PairwiseAlternativeMatrix = ({
  alternatives,
  evaluations,
  setEvaluations,
  collectiveEvaluations = [],
  permitEdit = true,
}) => {
  const theme = useTheme();

  console.log(evaluations)

  const sortedAlternatives = [...alternatives].sort((a, b) =>
    a.localeCompare(b)
  );

  const sortedEvaluations = [...(evaluations || [])].sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  const columns = [
    {
      field: "id",
      headerName: "Alternatives",
      minWidth: 90,
      flex: 1,
    },
    ...sortedAlternatives.map((alternative) => ({
      field: alternative,
      headerName: alternative,
      editable: permitEdit,
      flex: 1,
      minWidth: 90,
      valueGetter: (...args) => {
        const maybeParams = args[0];
        const maybeRow = args[1];

        if (maybeRow && typeof maybeRow === "object") {
          return getCellNumericValue(maybeRow?.[alternative]);
        }

        if (
          maybeParams &&
          typeof maybeParams === "object" &&
          "row" in maybeParams
        ) {
          return getCellNumericValue(maybeParams?.row?.[alternative]);
        }

        return getCellNumericValue(maybeParams);
      },
      renderCell: (params) => {
        const rowId = params.row.id;
        const altCol = params.field;
        const cell = params.row?.[altCol];
        const userValue = getCellNumericValue(cell);

        const collectiveRow = collectiveEvaluations.find(
          (row) => row.id === rowId
        );
        const collectiveValue = getCellNumericValue(collectiveRow?.[altCol]);

        const isDiagonal = rowId === altCol;
        const showNeutralFallback = shouldShowNeutralFallback(cell, isDiagonal);

        return (
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            {showNeutralFallback ? "Neutral" : userValue == null ? "" : userValue}

            {collectiveValue != null && !isDiagonal && (
              <Chip
                label={collectiveValue}
                variant="outlined"
                color="info"
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
    if (!permitEdit) {
      return oldRow;
    }

    const changedField = sortedAlternatives.find((field) => {
      const newValue = getCellNumericValue(newRow[field]);
      const oldValue = getCellNumericValue(oldRow[field]);
      return newValue !== oldValue;
    });

    if (!changedField) {
      return oldRow;
    }

    if (newRow.id === changedField) {
      return oldRow;
    }

    const previousCell = oldRow[changedField];
    const inverseRow = evaluations.find((row) => row.id === changedField);
    const inversePreviousCell = inverseRow?.[newRow.id];

    const sourceRange = getCellRange(previousCell);
    const targetRange = getCellRange(inversePreviousCell);

    const value = getCellNumericValue(newRow[changedField]);
    let updatedRows = [];

    if (
      value == null ||
      value < sourceRange.min ||
      value > sourceRange.max
    ) {
      updatedRows = evaluations.map((row) => {
        if (!row || typeof row !== "object" || !row.id) {
          return row;
        }

        if (row.id === newRow.id) {
          return {
            ...row,
            [changedField]: preserveCellShape(row[changedField], ""),
          };
        }

        if (row.id === changedField) {
          return {
            ...row,
            [newRow.id]: preserveCellShape(row[newRow.id], ""),
          };
        }

        return row;
      });

      setEvaluations(updatedRows);

      return {
        ...oldRow,
        [changedField]: preserveCellShape(previousCell, ""),
      };
    }

    const normalizedValue = round2(value);
    const inverseValue = getExpectedInverseValue({
      value: normalizedValue,
      sourceRange,
      targetRange,
    });

    updatedRows = evaluations.map((row) => {
      if (!row || typeof row !== "object" || !row.id) {
        return row;
      }

      if (row.id === newRow.id) {
        return {
          ...row,
          [changedField]: preserveCellShape(
            row[changedField],
            normalizedValue
          ),
        };
      }

      if (row.id === changedField) {
        return {
          ...row,
          [newRow.id]: preserveCellShape(row[newRow.id], inverseValue),
        };
      }

      return row;
    });

    setEvaluations(updatedRows);

    return {
      ...newRow,
      [changedField]: preserveCellShape(previousCell, normalizedValue),
    };
  };

  return (
    <DataGrid
      rows={sortedEvaluations}
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
      isCellEditable={(params) => permitEdit && params.row.id !== params.field}
      getRowId={(row) => row.id}
      getCellClassName={(params) => {
        if (params.field === "id") {
          return "first-column";
        }

        if (params.row.id === params.field) {
          return "diagonal-cell";
        }

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

export default PairwiseAlternativeMatrix;