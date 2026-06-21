import { forwardRef, useImperativeHandle } from "react";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { Box, Chip, MenuItem, Select, Stack, useTheme } from "@mui/material";
import { formatCollectiveDisplayValue } from "../../shared/formatCollectiveDisplayValue";
import { buildEvaluationMatrixDataGridSx } from "../../shared/evaluationMatrixTable.styles";

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

const getDomainType = (domain) => String(domain?.type || "").trim().toLowerCase();

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

const normalizeCell = (cell, fallbackDomain) => {
  if (cell === null || cell === undefined) {
    return { value: "", domain: fallbackDomain || null };
  }

  if (typeof cell === "object" && !Array.isArray(cell)) {
    return {
      value: cell?.value ?? "",
      domain: cell?.domain ?? cell?.expressionDomain ?? fallbackDomain ?? null,
    };
  }

  return {
    value: cell,
    domain: fallbackDomain || null,
  };
};

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

const AlternativeCriteriaMatrixView = (
  {
    evaluationContext,
    evaluationPayload,
    setEvaluationPayload,
    collectivePayload,
    readOnly,
    loading,
  },
  ref
) => {
  const theme = useTheme();
  const apiRef = useGridApiRef();
  const alternativeNames = Array.isArray(evaluationContext?.alternatives)
    ? evaluationContext.alternatives.map((alternative) => alternative?.name).filter(Boolean)
    : [];
  const criteria = Array.isArray(evaluationContext?.leafCriteria)
    ? evaluationContext.leafCriteria.filter(
        (criterion) => criterion?.name
      )
    : [];
  const criterionNames = criteria.map((criterion) => criterion.name);
  const criterionByName = new Map(criteria.map((criterion) => [criterion.name, criterion]));
  const resolvedPayload =
    evaluationPayload && typeof evaluationPayload === "object" && !Array.isArray(evaluationPayload)
      ? evaluationPayload
      : {};
  const resolvedCollectivePayload =
    collectivePayload && typeof collectivePayload === "object" && !Array.isArray(collectivePayload)
      ? collectivePayload
      : {};
  const permitEdit = readOnly !== true && loading !== true;

  const renderCollectiveChip = (collectiveValue) => {
    if (!hasCollectiveValue(collectiveValue)) {
      return null;
    }

    return (
      <Chip
        label={formatCollectiveDisplayValue(collectiveValue)}
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
    ...criterionNames.map((criterionName) => ({
      field: criterionName,
      headerName: criterionName,
      editable: permitEdit,
      flex: 1,
      minWidth: 120,
      valueGetter: (params) => {
        const cell = params.row?.[criterionName];
        return typeof cell === "object" ? cell?.value ?? "" : cell ?? "";
      },
      renderCell: (params) => {
        const rowId = params.row.id;
        const criterion = criterionByName.get(criterionName) || null;
        const cell = normalizeCell(
          resolvedPayload?.[rowId]?.[criterionName],
          criterion?.expressionDomain || null
        );
        const collectiveValue = getCollectiveDisplayValue(
          resolvedCollectivePayload?.[rowId]?.[criterionName]
        );
        const domain = cell.domain;
        const domainType = getDomainType(domain);
        const value = cell.value;

        if (domainType === "numeric") {
          return renderCellWithCollective({
            leftContent: value !== null && value !== "" ? value : "",
            collectiveValue,
          });
        }

        if (domainType === "linguistic") {
          const labels = domain?.linguisticLabels || domain?.labels || [];

          if (!permitEdit) {
            return renderCellWithCollective({
              leftContent: formatDisplayValue(value ?? ""),
              collectiveValue,
            });
          }

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

                    setEvaluationPayload((previous) => ({
                      ...(previous && typeof previous === "object" ? previous : {}),
                      [rowId]: {
                        ...((previous && previous[rowId]) || {}),
                        [criterionName]: { value: newValue, domain },
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

    const previousCell = normalizeCell(
      oldRow[changedField],
      domainsByCriterionName[changedField]
    );
    const domain = previousCell.domain;
    const domainType = getDomainType(domain);
    const raw = newRow[changedField];
    const rawValue =
      raw && typeof raw === "object" && !Array.isArray(raw) ? raw?.value : raw;

    let nextCell;

    if (domainType === "numeric") {
      if (rawValue === "" || rawValue === null || rawValue === undefined) {
        nextCell = { value: "", domain };
      } else {
        const numericValue = parseFloat(rawValue);
        const { min, max, step } = getNumericRange(domain);

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
          nextCell = { value: "", domain };
        } else {
          nextCell = {
            value: alignToStep({
              value: numericValue,
              min,
              max,
              step,
            }),
            domain,
          };
        }
      }
    } else if (domainType === "linguistic") {
      nextCell = { value: rawValue ?? "", domain };
    } else {
      nextCell = raw;
    }

    const resultRow = { ...newRow, [changedField]: nextCell };

    setEvaluationPayload((previous) => ({
      ...(previous && typeof previous === "object" ? previous : {}),
      [resultRow.id]: {
        ...((previous && previous[resultRow.id]) || {}),
        [changedField]: nextCell,
      },
    }));

    return resultRow;
  };

  const rows = alternativeNames.map((alternativeName) => {
    const row = { id: alternativeName };

    criterionNames.forEach((criterionName) => {
      row[criterionName] = normalizeCell(
        resolvedPayload?.[alternativeName]?.[criterionName],
        domainsByCriterionName[criterionName]
      );
    });

    return row;
  });

  const flushPendingEdits = async () => {
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
      apiRef.current.stopCellEditMode({ id, field });
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  useImperativeHandle(ref, () => ({
    flushPendingEdits,
    preparePayloadRead: flushPendingEdits,
  }));

  const handleCellClick = (params) => {
    if (!permitEdit) {
      return;
    }

    if (params.field === "id") {
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
    <Box
      sx={{
        width: "100%",
        maxWidth: "none",
        minWidth: 0,
        p: { xs: 1, sm: 1.5 },
        overflow: "hidden",
      }}
    >
      <DataGrid
        apiRef={apiRef}
        autoHeight
        disableColumnMenu
        disableColumnFilter
        disableColumnSorting
        disableColumnSelector
        disableRowSelectionOnClick
        hideFooter
        onCellClick={handleCellClick}
        density="compact"
        rows={rows}
        columns={columns}
        processRowUpdate={handleProcessRowUpdate}
        sx={{
          ...buildEvaluationMatrixDataGridSx(theme),
        }}
      />
    </Box>
  );
};

export default forwardRef(AlternativeCriteriaMatrixView);
