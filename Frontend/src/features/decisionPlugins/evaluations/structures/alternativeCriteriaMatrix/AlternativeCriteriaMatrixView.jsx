import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import {
  Box,
  Chip,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";

import { formatCollectiveDisplayValue } from "../../shared/formatCollectiveDisplayValue";
import { buildEvaluationMatrixDataGridSx } from "../../shared/evaluationMatrixTable.styles";
import {
  getExpressionDomainFamily,
  getExpressionDomainTypeKey,
} from "../../../../../utils/expressionDomains";
import { normalizeLabelKeyValue } from "../../../expressionDomains/helpers";

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

const hasCollectiveValue = (value) =>
  value !== null && value !== undefined && value !== "";

const normalizeDefinition = (expressionDomain) =>
  expressionDomain?.definition && typeof expressionDomain.definition === "object"
    ? expressionDomain.definition
    : {};

const isNumericDomain = (expressionDomain) => {
  const typeKey = getExpressionDomainTypeKey(expressionDomain);
  const family = getExpressionDomainFamily(expressionDomain);

  return (
    typeKey === "numericContinuous" ||
    typeKey === "numericDiscrete" ||
    family === "numeric"
  );
};

const isLinguisticDomain = (expressionDomain) => {
  const typeKey = getExpressionDomainTypeKey(expressionDomain);
  const family = getExpressionDomainFamily(expressionDomain);

  return (
    typeKey === "linguisticOrdinal" ||
    typeKey === "linguisticFuzzy" ||
    family === "linguistic"
  );
};

const getNumericDomainMeta = (expressionDomain) => {
  const definition = normalizeDefinition(expressionDomain);
  const typeKey = getExpressionDomainTypeKey(expressionDomain);
  const min = Number(definition.min);
  const max = Number(definition.max);
  const rawStep = Number(definition.step);

  return {
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
    step:
      Number.isFinite(rawStep) && rawStep > 0
        ? rawStep
        : typeKey === "numericDiscrete"
          ? 1
          : null,
  };
};

const getCellPlainValue = (cell) => {
  if (cell == null) return "";
  if (typeof cell === "object" && !Array.isArray(cell)) {
    return cell?.value ?? "";
  }
  return cell;
};

const parseNumericCellInput = (rawValue) => {
  if (rawValue === "" || rawValue == null) {
    return { kind: "empty", value: "" };
  }

  const parsed = parseFloat(rawValue);
  if (Number.isFinite(parsed)) {
    return { kind: "number", value: parsed };
  }

  return { kind: "invalid", value: rawValue };
};

const isStepAligned = ({ value, min = 0, step }) => {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    return true;
  }

  const ratio = (value - min) / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-9;
};

const buildCellValidationKey = (rowId, criterionId) => `${rowId}::${criterionId}`;

const validateCellValue = ({
  cellValue,
  expressionDomain,
  alternativeName,
  criterionName,
}) => {
  const typeKey = getExpressionDomainTypeKey(expressionDomain);

  if (isNumericDomain(expressionDomain)) {
    if (cellValue === "" || cellValue == null) {
      return null;
    }

    const parsed = parseFloat(cellValue);
    if (!Number.isFinite(parsed)) {
      return {
        alternativeName,
        criterionName,
        message: "Enter a valid number.",
      };
    }

    const { min, max, step } = getNumericDomainMeta(expressionDomain);

    if (Number.isFinite(min) && Number.isFinite(max) && (parsed < min || parsed > max)) {
      return {
        alternativeName,
        criterionName,
        message: `Value must be between ${min} and ${max}.`,
      };
    }

    if (
      typeKey === "numericDiscrete" &&
      Number.isFinite(step) &&
      step > 0 &&
      !isStepAligned({
        value: parsed,
        min: min ?? 0,
        step,
      })
    ) {
      return {
        alternativeName,
        criterionName,
        message: `Value must follow step ${step}.`,
      };
    }

    return null;
  }

  if (isLinguisticDomain(expressionDomain)) {
    if (cellValue === "" || cellValue == null) {
      return null;
    }

    const labels = Array.isArray(expressionDomain?.definition?.labels)
      ? expressionDomain.definition.labels
      : [];
    const labelKey = normalizeLabelKeyValue(cellValue);
    const labelExists = labels.some((labelItem) => labelItem?.key === labelKey);

    if (!labelExists) {
      return {
        alternativeName,
        criterionName,
        message: "Select a valid domain label.",
      };
    }
  }

  return null;
};

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
  const [validationErrorsByCell, setValidationErrorsByCell] = useState({});
  const alternativeItems = Array.isArray(evaluationContext?.alternatives)
    ? evaluationContext.alternatives
        .map((alternative) => ({
          id: String(alternative?.id ?? alternative?._id ?? "").trim(),
          name: String(alternative?.name ?? "").trim(),
        }))
        .filter((alternative) => alternative.id && alternative.name)
    : [];
  const criteria = Array.isArray(evaluationContext?.leafCriteria)
    ? evaluationContext.leafCriteria
        .map((criterion) => ({
          ...criterion,
          id: String(criterion?.id ?? criterion?._id ?? "").trim(),
          name: String(criterion?.name ?? "").trim(),
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];
  const resolvedPayload =
    evaluationPayload && typeof evaluationPayload === "object" && !Array.isArray(evaluationPayload)
      ? evaluationPayload
      : {};
  const resolvedCollectivePayload =
    collectivePayload && typeof collectivePayload === "object" && !Array.isArray(collectivePayload)
      ? collectivePayload
      : {};
  const permitEdit = readOnly !== true && loading !== true;

  const validationResult = useMemo(() => {
    const errors = [];

    alternativeItems.forEach((alternative) => {
      criteria.forEach((criterion) => {
        const cell = normalizeCell(
          resolvedPayload?.[alternative.id]?.[criterion.id],
          criterion?.expressionDomain || null
        );
        const validationError = validateCellValue({
          cellValue: cell.value,
          expressionDomain: cell.domain,
          alternativeName: alternative.name,
          criterionName: criterion.name,
        });

        if (validationError) {
          errors.push({
            rowId: alternative.id,
            alternativeName: alternative.name,
            criterionId: criterion.id,
            criterionName: criterion.name,
            message: validationError.message,
          });
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [alternativeItems, criteria, resolvedPayload]);

  const validationErrorsMap = useMemo(
    () =>
      validationResult.errors.reduce((accumulator, item) => {
        accumulator[buildCellValidationKey(item.rowId, item.criterionId)] = item.message;
        return accumulator;
      }, {}),
    [validationResult.errors]
  );

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
        sx={{
          flex: 1,
          minWidth: 0,
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

  const updateCellValue = ({ rowId, criterionId, expressionDomain, nextValue }) => {
    const validationKey = buildCellValidationKey(rowId, criterionId);

    setValidationErrorsByCell((previous) => {
      if (!previous[validationKey]) {
        return previous;
      }

      const nextErrors = { ...previous };
      delete nextErrors[validationKey];
      return nextErrors;
    });

    setEvaluationPayload((previous) => ({
      ...(previous && typeof previous === "object" ? previous : {}),
      [rowId]: {
        ...((previous && previous[rowId]) || {}),
        [criterionId]: {
          value: nextValue,
          expressionDomain,
        },
      },
    }));
  };

  const columns = [
    {
      field: "alternativeLabel",
      headerName: "Alternative/Criterion",
      minWidth: 120,
      flex: 1,
    },
    ...criteria.map((criterion) => ({
      field: criterion.id,
      headerName: criterion.name,
      type: isNumericDomain(criterion?.expressionDomain || null) ? "number" : "string",
      flex: 1,
      minWidth: 120,
      editable:
        permitEdit &&
        isNumericDomain(criterion?.expressionDomain || null),
      valueGetter: (...args) => {
        const maybeParams = args[0];
        const maybeRow = args[1];

        if (maybeRow && typeof maybeRow === "object") {
          return getCellPlainValue(maybeRow?.[criterion.id]);
        }

        if (
          maybeParams &&
          typeof maybeParams === "object" &&
          "row" in maybeParams
        ) {
          return getCellPlainValue(maybeParams?.row?.[criterion.id]);
        }

        return getCellPlainValue(maybeParams);
      },
      renderCell: (params) => {
        const rowId = params.row.id;
        const cell = normalizeCell(
          resolvedPayload?.[rowId]?.[criterion.id],
          criterion?.expressionDomain || null
        );
        const collectiveValue = getCollectiveDisplayValue(
          resolvedCollectivePayload?.[rowId]?.[criterion.id]
        );
        const expressionDomain = cell.domain;
        const typeKey = getExpressionDomainTypeKey(expressionDomain);
        const cellError =
          validationErrorsByCell[buildCellValidationKey(rowId, criterion.id)] || "";

        if (!typeKey) {
          return renderCellWithCollective({
            leftContent: (
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", fontWeight: 700 }}
              >
                Missing domain type
              </Typography>
            ),
            collectiveValue,
          });
        }

        if (isNumericDomain(expressionDomain)) {
          return renderCellWithCollective({
            leftContent: (
              <Box
                component="span"
                sx={{
                  width: "100%",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  color: cellError ? "error.main" : "text.primary",
                  fontWeight: cellError ? 700 : 400,
                }}
                title={cellError || undefined}
              >
                {cell.value === "" || cell.value == null ? "" : cell.value}
              </Box>
            ),
            collectiveValue,
          });
        }

        if (isLinguisticDomain(expressionDomain)) {
          const labels = Array.isArray(expressionDomain?.definition?.labels)
            ? expressionDomain.definition.labels
            : [];
          const labelKey = normalizeLabelKeyValue(cell.value);

          return renderCellWithCollective({
            leftContent: (
              <Box
                sx={{ width: "100%", minWidth: 0 }}
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <FormControl variant="standard" size="small" fullWidth error={Boolean(cellError)}>
                  <Select
                    value={labelKey}
                    onChange={(event) => {
                      if (!permitEdit) {
                        return;
                      }

                      updateCellValue({
                        rowId,
                        criterionId: criterion.id,
                        expressionDomain,
                        nextValue: { labelKey: event.target.value },
                      });
                    }}
                    disabled={!permitEdit}
                    color="info"
                    displayEmpty
                    disableUnderline
                    sx={{
                      minWidth: 0,
                      fontSize: "0.875rem",
                      "& .MuiSelect-select": {
                        py: 0.5,
                        pr: 3,
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {labels.map((labelItem) => (
                      <MenuItem key={labelItem.key} value={labelItem.key}>
                        {labelItem.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            ),
            collectiveValue,
          });
        }

        return renderCellWithCollective({
          leftContent: (
            <Typography
              variant="caption"
              sx={{ color: "text.disabled", fontWeight: 700 }}
            >
              Unsupported domain: {typeKey}
            </Typography>
          ),
          collectiveValue,
        });
      },
    })),
  ];

  const rows = alternativeItems.map((alternative) => {
    const row = { id: alternative.id, alternativeLabel: alternative.name };

    criteria.forEach((criterion) => {
      row[criterion.id] = normalizeCell(
        resolvedPayload?.[alternative.id]?.[criterion.id],
        criterion?.expressionDomain || null
      );
    });

    return row;
  });

  const handleProcessRowUpdate = (newRow, oldRow) => {
    if (!permitEdit) {
      return oldRow;
    }

    const changedCriterion = criteria.find((criterion) => {
      const field = criterion.id;
      return getCellPlainValue(newRow[field]) !== getCellPlainValue(oldRow[field]);
    });

    if (!changedCriterion) {
      return oldRow;
    }

    const field = changedCriterion.id;
    const previousCell = normalizeCell(
      oldRow[field],
      changedCriterion?.expressionDomain || null
    );
    const expressionDomain = previousCell.domain;

    if (!isNumericDomain(expressionDomain)) {
      return oldRow;
    }

    const parsedInput = parseNumericCellInput(getCellPlainValue(newRow[field]));
    let nextValue = getCellPlainValue(newRow[field]);

    if (parsedInput.kind === "number") {
      nextValue = parsedInput.value;
    } else if (parsedInput.kind === "empty") {
      nextValue = "";
    }

    updateCellValue({
      rowId: newRow.id,
      criterionId: field,
      expressionDomain,
      nextValue,
    });

    return {
      ...oldRow,
      [field]: {
        ...previousCell,
        value: nextValue,
      },
    };
  };

  const handleCellClick = (params) => {
    if (!permitEdit) {
      return;
    }

    if (params.field === "alternativeLabel") {
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

  const flushPendingEdits = async () => {
    await Promise.resolve();
  };

  useImperativeHandle(ref, () => ({
    flushPendingEdits,
    preparePayloadRead: flushPendingEdits,
    validatePayloadRead: () => {
      setValidationErrorsByCell(validationErrorsMap);
      return validationResult;
    },
  }));

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
        autoHeight
        disableColumnMenu
        disableColumnFilter
        disableColumnSorting
        disableColumnSelector
        disableRowSelectionOnClick
        hideFooter
        processRowUpdate={handleProcessRowUpdate}
        experimentalFeatures={{ newEditingApi: true }}
        apiRef={apiRef}
        onCellClick={handleCellClick}
        density="compact"
        rows={rows}
        columns={columns}
        isCellEditable={(params) =>
          permitEdit &&
          params.field !== "alternativeLabel" &&
          isNumericDomain(params.row?.[params.field]?.domain)
        }
        getRowId={(row) => row.id}
        sx={{
          ...buildEvaluationMatrixDataGridSx(theme),
        }}
      />
    </Box>
  );
};

export default forwardRef(AlternativeCriteriaMatrixView);
