import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { Box, Chip, Stack, useTheme } from "@mui/material";
import { formatCollectiveDisplayValue } from "../../../shared/formatCollectiveDisplayValue";
import { buildEvaluationMatrixDataGridSx } from "../../../shared/evaluationMatrixTable.styles";

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

const getCollectiveDisplayValue = (cell) => {
  if (cell == null) return null;
  if (typeof cell !== "object" || Array.isArray(cell)) {
    return cell;
  }

  if (cell.localizedLabel != null && cell.localizedLabel !== "") {
    return cell.localizedLabel;
  }

  if (cell.localizedValue != null && cell.localizedValue !== "") {
    return cell.localizedValue;
  }

  if (cell.value != null && cell.value !== "") {
    return cell.value;
  }

  return null;
};

const getCellDomain = (cell) => {
  if (cell && typeof cell === "object") {
    return cell.domain || cell.expressionDomain || null;
  }

  return null;
};

const getCellRange = (cell) => {
  const domain = getCellDomain(cell);
  const min = Number(domain?.range?.min);
  const max = Number(domain?.range?.max);
  const step = Number(domain?.range?.step);

  if (Number.isFinite(min) && Number.isFinite(max) && min < max) {
    return {
      min,
      max,
      step: Number.isFinite(step) && step > 0 ? step : null,
    };
  }

  return { min: 0, max: 1, step: null };
};

const round2 = (value) => Math.round(value * 100) / 100;

const alignToStep = ({ value, min, max, step }) => {
  if (!Number.isFinite(step) || step <= 0) {
    return round2(value);
  }

  const snapped = min + Math.round((value - min) / step) * step;
  const bounded = Math.min(max, Math.max(min, snapped));

  return round2(bounded);
};

const isStepAligned = ({ value, min, max, step }) => {
  if (!Number.isFinite(step) || step <= 0) {
    return true;
  }

  const aligned = alignToStep({ value, min, max, step });
  return Math.abs(aligned - value) < 1e-9;
};

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
  const expected = denormalizeFromUnit(
    inverseNormalized,
    targetRange.min,
    targetRange.max
  );

  return alignToStep({
    value: expected,
    min: targetRange.min,
    max: targetRange.max,
    step: targetRange.step,
  });
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

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const buildCell = ({ value = "", expressionDomain = null } = {}) => ({
  value,
  expressionDomain,
});

const buildRowsFromComparisons = ({
  alternatives,
  comparisons,
}) =>
  alternatives.map((rowAlternative) => {
    const row = {
      id: rowAlternative.id,
      alternativeLabel: rowAlternative.name,
    };
    const rowComparisons = isPlainObject(comparisons?.[rowAlternative.id])
      ? comparisons[rowAlternative.id]
      : {};

    for (const colAlternative of alternatives) {
      if (rowAlternative.id === colAlternative.id) {
        row[colAlternative.id] = buildCell({
          value: "Neutral",
          expressionDomain: null,
        });
        continue;
      }

      const cell = rowComparisons[colAlternative.id];
      row[colAlternative.id] = isPlainObject(cell)
        ? cell
        : buildCell();
    }

    return row;
  });

const buildComparisonsFromRows = (rows, alternatives) => {
  const rowMap = new Map(
    (Array.isArray(rows) ? rows : [])
      .filter((row) => row && typeof row === "object" && row.id)
      .map((row) => [row.id, row])
  );

  return Object.fromEntries(
    alternatives.map((rowAlternative) => [
      rowAlternative.id,
      Object.fromEntries(
        alternatives
          .filter((colAlternative) => colAlternative.id !== rowAlternative.id)
          .map((colAlternative) => {
            const sourceCell = rowMap.get(rowAlternative.id)?.[colAlternative.id];

            return [
              colAlternative.id,
              isPlainObject(sourceCell) ? sourceCell : buildCell(),
            ];
          })
      ),
    ])
  );
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
 * @param {{id: string, name: string}[]} props.alternatives
 * @param {Object[]} props.evaluations
 * @param {Function} props.setEvaluations
 * @param {Object[]} [props.collectiveEvaluations=[]]
 * @param {boolean} [props.permitEdit=true]
 * @returns {JSX.Element}
 */
const PairwiseAlternativesGrid = ({
  alternatives,
  evaluations,
  setEvaluations,
  collectiveEvaluations = null,
  permitEdit = true,
}) => {
  const theme = useTheme();

  const apiRef = useGridApiRef();

  const orderedAlternatives = Array.isArray(alternatives)
    ? alternatives.filter((alternative) => alternative?.id && alternative?.name)
    : [];
  const orderedAlternativeIds = orderedAlternatives.map((alternative) => alternative.id);
  const orderedEvaluations = buildRowsFromComparisons({
    alternatives: orderedAlternatives,
    comparisons: evaluations,
  });
  const collectiveRows = buildRowsFromComparisons({
    alternatives: orderedAlternatives,
    comparisons: collectiveEvaluations,
  });

  const columns = [
    {
      field: "alternativeLabel",
      headerName: "Alternatives",
      minWidth: 90,
      flex: 1,
    },
    ...orderedAlternatives.map((alternative) => ({
      field: alternative.id,
      headerName: alternative.name,
      editable: permitEdit,
      flex: 1,
      minWidth: 90,
      valueGetter: (...args) => {
        const maybeParams = args[0];
        const maybeRow = args[1];

        if (maybeRow && typeof maybeRow === "object") {
          return getCellNumericValue(maybeRow?.[alternative.id]);
        }

        if (
          maybeParams &&
          typeof maybeParams === "object" &&
          "row" in maybeParams
        ) {
          return getCellNumericValue(maybeParams?.row?.[alternative.id]);
        }

        return getCellNumericValue(maybeParams);
      },
      renderCell: (params) => {
        const rowId = params.row.id;
        const altCol = params.field;
        const cell = params.row?.[altCol];
        const userValue = getCellNumericValue(cell);

        const collectiveRow = collectiveRows.find((row) => row.id === rowId);
        const collectiveValue = getCollectiveDisplayValue(collectiveRow?.[altCol]);

        const isDiagonal = rowId === altCol;

        return (
          <Stack
            direction="row"
            alignItems="center"
            sx={{
              width: "100%",
              height: "100%",
              minWidth: 0,
            }}
          >
            <Box
              component="span"
              sx={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
              }}
            >
              {isDiagonal ? "Neutral" : userValue == null ? "" : userValue}
            </Box>

            {collectiveValue != null && collectiveValue !== "" && !isDiagonal ? (
              <Box
                sx={{
                  ml: 1,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                <Chip
                  label={formatCollectiveDisplayValue(collectiveValue)}
                  variant="outlined"
                  color="info"
                  size="small"
                  sx={{
                    fontSize: "0.75rem",
                    height: 20,
                    pointerEvents: "none",
                  }}
                />
              </Box>
            ) : null}
          </Stack>
        );
      },
    })),
  ];

  const handleProcessRowUpdate = (newRow, oldRow) => {
    if (!permitEdit) {
      return oldRow;
    }

    const changedField = orderedAlternativeIds.find((field) => {
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
    const inverseRow = orderedEvaluations.find((row) => row.id === changedField);
    const inversePreviousCell = inverseRow?.[newRow.id];

    const sourceRange = getCellRange(previousCell);
    const targetRange = getCellRange(inversePreviousCell);

    const value = getCellNumericValue(newRow[changedField]);
    let updatedRows = [];

    if (
      value == null ||
      value < sourceRange.min ||
      value > sourceRange.max ||
      !isStepAligned({
        value,
        min: sourceRange.min,
        max: sourceRange.max,
        step: sourceRange.step,
      })
    ) {
      updatedRows = orderedEvaluations.map((row) => {
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

      setEvaluations(buildComparisonsFromRows(updatedRows, orderedAlternatives));

      return {
        ...oldRow,
        [changedField]: preserveCellShape(previousCell, ""),
      };
    }

    const normalizedValue = alignToStep({
      value,
      min: sourceRange.min,
      max: sourceRange.max,
      step: sourceRange.step,
    });
    const inverseValue = getExpectedInverseValue({
      value: normalizedValue,
      sourceRange,
      targetRange,
    });

    updatedRows = orderedEvaluations.map((row) => {
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

    setEvaluations(buildComparisonsFromRows(updatedRows, orderedAlternatives));

    return {
      ...newRow,
      [changedField]: preserveCellShape(previousCell, normalizedValue),
    };
  };

  const handleCellClick = (params) => {
    if (!permitEdit) {
      return;
    }

    if (params.field === "alternativeLabel") {
      return;
    }

    if (params.row.id === params.field) {
      return;
    }

    if (!params.isEditable) {
      return;
    }

    apiRef.current.startCellEditMode({
      id: params.id,
      field: params.field,
    });
  };

  return (
    <DataGrid
      rows={orderedEvaluations}
      columns={columns}
      disableColumnMenu
      hideFooter
      disableColumnFilter
      disableColumnSorting
      processRowUpdate={handleProcessRowUpdate}
      experimentalFeatures={{ newEditingApi: true }}
      disableRowSelectionOnClick
      disableColumnSelector
      apiRef={apiRef}
      onCellClick={handleCellClick}
      density="compact"
      isCellEditable={(params) => permitEdit && params.row.id !== params.field}
      getRowId={(row) => row.id}
      getCellClassName={(params) => {
        if (params.field === "alternativeLabel") {
          return "first-column";
        }

        if (params.row.id === params.field) {
          return "diagonal-cell";
        }

        return "grid-cell";
      }}
      sx={{
        ...buildEvaluationMatrixDataGridSx(theme),
      }}
    />
  );
};

export default PairwiseAlternativesGrid;
