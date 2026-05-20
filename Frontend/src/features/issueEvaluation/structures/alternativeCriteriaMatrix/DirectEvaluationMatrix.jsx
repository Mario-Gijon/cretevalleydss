import { forwardRef, useImperativeHandle } from "react";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { Box, Chip, MenuItem, Select, Stack, useTheme } from "@mui/material";

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
}, ref) => {
  const theme = useTheme();
  const apiRef = useGridApiRef();

  const getNumericRange = (domain) => {
    const min = Number(domain?.numericRange?.min ?? domain?.range?.min);
    const max = Number(domain?.numericRange?.max ?? domain?.range?.max);
    const step = Number(domain?.numericRange?.step ?? domain?.range?.step);

    return {
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 1,
      step: Number.isFinite(step) && step > 0 ? step : null,
    };
  };

  const getDomainType = (domain) =>
    String(domain?.type || "").trim().toLowerCase();

  const alignToStep = ({ value, min, max, step }) => {
    if (!Number.isFinite(step) || step <= 0) {
      return Math.round(value * 100) / 100;
    }

    const snapped = min + Math.round((value - min) / step) * step;
    const bounded = Math.min(max, Math.max(min, snapped));

    return Math.round(bounded * 100) / 100;
  };

  const isStepAligned = ({ value, min, max, step }) => {
    if (!Number.isFinite(step) || step <= 0) {
      return true;
    }

    const aligned = alignToStep({ value, min, max, step });
    return Math.abs(aligned - value) < 1e-9;
  };

  const getDomain = (cell) =>
    cell && typeof cell === "object" && cell.domain ? cell.domain : null;

  const getValue = (cell) =>
    cell && typeof cell === "object" ? cell.value : cell;

  const getCollectiveDisplayValue = (cell) => {
    if (cell == null) return null;
    if (typeof cell !== "object") return cell;
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

  const formatDisplayValue = (value) => {
    if (Array.isArray(value)) {
      return `[${value.join(", ")}]`;
    }

    return value;
  };

  const hasCollectiveValue = (value) =>
    value !== null && value !== undefined && value !== "";

  const renderCollectiveChip = (collectiveValue) => {
    if (!hasCollectiveValue(collectiveValue)) {
      return null;
    }

    return (
      <Chip
        label={formatDisplayValue(collectiveValue)}
        variant="outlined"
        size="small"
        sx={{
          ml: 1,
          fontSize: "0.75rem",
          height: 20,
          pointerEvents: "none",
          flexShrink: 0,
        }}
        color="info"
      />
    );
  };

  const renderCellWithCollective = ({ leftContent, collectiveValue }) => (
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
        {leftContent}
      </Box>
      {hasCollectiveValue(collectiveValue) ? (
        <Box
          sx={{
            ml: 1,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          {renderCollectiveChip(collectiveValue)}
        </Box>
      ) : null}
    </Stack>
  );

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
        const collectiveValue = getCollectiveDisplayValue(
          collectiveEvaluations?.[rowId]?.[critName]
        );

        if (cell == null) {
          return "";
        }

        const domain = getDomain(cell);
        const domainType = getDomainType(domain);
        const value = getValue(cell);

        if (domainType === "numeric") {
          const userValue = value;
          return renderCellWithCollective({
            leftContent: userValue !== null && userValue !== "" ? userValue : "",
            collectiveValue,
          });
        }

        if (domainType === "linguistic") {
          const labels = domain.linguisticLabels || domain.labels || [];

          return renderCellWithCollective({
            leftContent: (
              <Box sx={{ minWidth: 0, flex: 1 }}>
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
                  <MenuItem value="">
                    <em>Select label</em>
                  </MenuItem>
                  {labels.map((label, index) => (
                    <MenuItem key={index} value={label.label}>
                      {label.label}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            ),
            collectiveValue,
          });
        }

        if (domainType) {
          return renderCellWithCollective({
            leftContent: `Unsupported domain type: ${domain.type}`,
            collectiveValue,
          });
        }

        return renderCellWithCollective({
          leftContent: formatDisplayValue(value ?? ""),
          collectiveValue,
        });
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
    const prevDomainType = getDomainType(prevDomain);
    const raw = newRow[changedField];

    let nextCell;

    if (prevDomainType === "numeric") {
      const rawValue = getValue(raw);
      if (rawValue === "" || rawValue === null || rawValue === undefined) {
        nextCell = { value: "", domain: prevDomain };
      } else {
      const numericValue = parseFloat(rawValue);
      const { min, max, step } = getNumericRange(prevDomain);

      if (
        Number.isNaN(numericValue) ||
        numericValue < min ||
        numericValue > max ||
        !isStepAligned({
          value: numericValue,
          min,
          max,
          step,
        })
      ) {
        nextCell = { value: "", domain: prevDomain };
      } else {
        nextCell = {
          value: alignToStep({
            value: numericValue,
            min,
            max,
            step,
          }),
          domain: prevDomain,
        };
      }
      }
    } else if (prevDomainType === "linguistic") {
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
        evaluations?.[alternative]?.[criterion] ?? { value: "", domain: null };
    });

    return row;
  });

  useImperativeHandle(
    ref,
    () => ({
      flushPendingEdits: async () => {
        const cellModesModel = apiRef.current?.state?.cellModesModel || {};
        const editCells = [];

        for (const [rowId, fields] of Object.entries(cellModesModel)) {
          for (const [field, config] of Object.entries(fields || {})) {
            if (config?.mode === "edit") {
              editCells.push({ id: rowId, field });
            }
          }
        }

        editCells.forEach(({ id, field }) => {
          try {
            apiRef.current.stopCellEditMode({ id, field });
          } catch (error) {
            console.log(error)
          }
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
      },
    }),
    [apiRef]
  );

  return (
    <DataGrid
      apiRef={apiRef}
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

export default forwardRef(DirectEvaluationMatrix);
