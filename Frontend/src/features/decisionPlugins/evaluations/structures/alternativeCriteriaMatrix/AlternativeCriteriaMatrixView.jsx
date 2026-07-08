import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Box,
  Chip,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";

import { formatCollectiveDisplayValue } from "../../shared/formatCollectiveDisplayValue";
import { buildEvaluationMatrixDataGridSx } from "../../shared/evaluationMatrixTable.styles";
import ExpressionDomainEvaluationInput from "../../shared/ExpressionDomainEvaluationInput.jsx";
import { validateExpressionDomainEvaluation } from "../../../expressionDomains";

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

const isEmptyCellValue = (value) =>
  value === "" || value === null || value === undefined;

const buildCellValidationKey = (rowId, criterionId) => `${rowId}::${criterionId}`;

const validateCellValue = ({
  cellValue,
  expressionDomain,
  alternativeName,
  criterionName,
}) => {
  if (isEmptyCellValue(cellValue)) {
    return null;
  }

  try {
    validateExpressionDomainEvaluation({
      value: cellValue,
      expressionDomain,
    });
  } catch (validationError) {
    return {
      alternativeName,
      criterionName,
      message:
        validationError instanceof Error
          ? validationError.message
          : "Value is invalid.",
    };
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
  const [validationErrorsByCell, setValidationErrorsByCell] = useState({});
  const alternativeItems = useMemo(
    () =>
      Array.isArray(evaluationContext?.alternatives)
        ? evaluationContext.alternatives
            .map((alternative) => ({
              id: String(alternative?.id ?? alternative?._id ?? "").trim(),
              name: String(alternative?.name ?? "").trim(),
            }))
            .filter((alternative) => alternative.id && alternative.name)
        : [],
    [evaluationContext?.alternatives]
  );
  const criteria = useMemo(
    () =>
      Array.isArray(evaluationContext?.leafCriteria)
        ? evaluationContext.leafCriteria
            .map((criterion) => ({
              ...criterion,
              id: String(criterion?.id ?? criterion?._id ?? "").trim(),
              name: String(criterion?.name ?? "").trim(),
            }))
            .filter((criterion) => criterion.id && criterion.name)
        : [],
    [evaluationContext?.leafCriteria]
  );
  const resolvedPayload = useMemo(
    () =>
      evaluationPayload &&
      typeof evaluationPayload === "object" &&
      !Array.isArray(evaluationPayload)
        ? evaluationPayload
        : {},
    [evaluationPayload]
  );
  const resolvedCollectivePayload = useMemo(
    () =>
      collectivePayload &&
      typeof collectivePayload === "object" &&
      !Array.isArray(collectivePayload)
        ? collectivePayload
        : {},
    [collectivePayload]
  );
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
    const alternative = alternativeItems.find((item) => item.id === rowId) || null;
    const criterion = criteria.find((item) => item.id === criterionId) || null;
    const nextValidationError = validateCellValue({
      cellValue: nextValue,
      expressionDomain,
      alternativeName: alternative?.name || rowId,
      criterionName: criterion?.name || criterionId,
    });

    setValidationErrorsByCell((previous) => {
      if (!nextValidationError && !previous[validationKey]) {
        return previous;
      }

      const nextErrors = { ...previous };

      if (nextValidationError) {
        nextErrors[validationKey] = nextValidationError.message;
      } else {
        delete nextErrors[validationKey];
      }

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
      flex: 1,
      minWidth: 120,
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
        const cellError =
          validationErrorsByCell[buildCellValidationKey(rowId, criterion.id)] || "";

        return renderCellWithCollective({
          leftContent: (
            <Box
              sx={{ width: "100%", minWidth: 0 }}
              title={cellError || undefined}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <ExpressionDomainEvaluationInput
                expressionDomain={expressionDomain}
                value={cell.value}
                onChange={(nextValue) => {
                  if (!permitEdit) {
                    return;
                  }

                  updateCellValue({
                    rowId,
                    criterionId: criterion.id,
                    expressionDomain,
                    nextValue,
                  });
                }}
                disabled={!permitEdit}
                error={Boolean(cellError)}
                showHelperText={false}
                fallback={(
                  <Typography
                    variant="caption"
                    sx={{
                      color: cellError ? "error.main" : "text.disabled",
                      fontWeight: 700,
                    }}
                  >
                    {expressionDomain?.typeKey
                      ? `Unsupported domain: ${expressionDomain.typeKey}`
                      : "Missing domain type"}
                  </Typography>
                )}
              />
            </Box>
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
        density="compact"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        sx={{
          ...buildEvaluationMatrixDataGridSx(theme),
        }}
      />
    </Box>
  );
};

export default forwardRef(AlternativeCriteriaMatrixView);
