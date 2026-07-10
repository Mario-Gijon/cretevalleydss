import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Box,
  Chip,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";

import ExpressionDomainEvaluationInput from "../../../../expressionDomains/ExpressionDomainEvaluationInput.jsx";
import { validateExpressionDomainEvaluation } from "../../../../expressionDomains";
import { formatCollectiveDisplayValue } from "../../shared/formatCollectiveDisplayValue";
import { buildEvaluationMatrixDataGridSx } from "../../shared/evaluationMatrixTable.styles";
import {
  resolveMatrixCell,
  resolveMatrixPayload,
} from "./resolveAlternativeCriteriaMatrixCell";

const resolveEvaluationAlternatives = (evaluationContext) =>
  Array.isArray(evaluationContext?.alternatives)
    ? evaluationContext.alternatives
        .map((alternative) => ({
          id: String(alternative?.id ?? alternative?._id ?? "").trim(),
          name: String(alternative?.name ?? "").trim(),
        }))
        .filter((alternative) => alternative.id && alternative.name)
    : [];

const resolveEvaluationCriteria = (evaluationContext) =>
  Array.isArray(evaluationContext?.leafCriteria)
    ? evaluationContext.leafCriteria
        .map((criterion) => ({
          ...criterion,
          id: String(criterion?.id ?? criterion?._id ?? "").trim(),
          name: String(criterion?.name ?? "").trim(),
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];

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

const isEmptyMatrixValue = (value) =>
  value === "" || value === null || value === undefined;

const buildCellValidationKey = (rowId, criterionId) => `${rowId}::${criterionId}`;

const validateMatrixValue = ({
  value,
  expressionDomain,
  alternativeName,
  criterionName,
}) => {
  if (isEmptyMatrixValue(value)) {
    return null;
  }

  try {
    validateExpressionDomainEvaluation({
      value,
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

const buildValidationErrorMap = (errors) =>
  errors.reduce((errorMap, errorItem) => {
    errorMap[buildCellValidationKey(errorItem.rowId, errorItem.criterionId)] =
      errorItem.message;
    return errorMap;
  }, {});

const buildNextMatrixPayload = ({
  previousPayload,
  rowId,
  criterionId,
  expressionDomain,
  nextValue,
}) => ({
  ...resolveMatrixPayload(previousPayload),
  [rowId]: {
    ...resolveMatrixPayload(previousPayload?.[rowId]),
    [criterionId]: {
      value: nextValue,
      expressionDomain,
    },
  },
});

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

  // Context data
  const alternativeItems = useMemo(
    () => resolveEvaluationAlternatives(evaluationContext),
    [evaluationContext]
  );
  const criteria = useMemo(
    () => resolveEvaluationCriteria(evaluationContext),
    [evaluationContext]
  );
  const alternativeNameById = useMemo(
    () =>
      new Map(
        alternativeItems.map((alternative) => [alternative.id, alternative.name])
      ),
    [alternativeItems]
  );
  const criterionNameById = useMemo(
    () => new Map(criteria.map((criterion) => [criterion.id, criterion.name])),
    [criteria]
  );

  // Payload data
  const resolvedPayload = useMemo(
    () => resolveMatrixPayload(evaluationPayload),
    [evaluationPayload]
  );
  const resolvedCollectivePayload = useMemo(
    () => resolveMatrixPayload(collectivePayload),
    [collectivePayload]
  );
  const matrixRows = useMemo(
    () =>
      alternativeItems.map((alternative) => {
        const row = {
          id: alternative.id,
          alternativeLabel: alternative.name,
        };

        criteria.forEach((criterion) => {
          row[criterion.id] = resolveMatrixCell({
            cell: resolvedPayload?.[alternative.id]?.[criterion.id],
            fallbackExpressionDomain: criterion.expressionDomain || null,
          });
        });

        return row;
      }),
    [alternativeItems, criteria, resolvedPayload]
  );
  const permitEdit = readOnly !== true && loading !== true;

  // Validation
  const validationResult = useMemo(() => {
    const errors = [];

    matrixRows.forEach((row) => {
      criteria.forEach((criterion) => {
        const cell = row[criterion.id];
        const validationError = validateMatrixValue({
          value: cell.value,
          expressionDomain: cell.expressionDomain,
          alternativeName: row.alternativeLabel,
          criterionName: criterion.name,
        });

        if (validationError) {
          errors.push({
            rowId: row.id,
            alternativeName: row.alternativeLabel,
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
  }, [criteria, matrixRows]);
  const validationErrorsMap = useMemo(
    () => buildValidationErrorMap(validationResult.errors),
    [validationResult.errors]
  );

  // Update handlers
  const updateCellValue = ({ rowId, criterionId, expressionDomain, nextValue }) => {
    const validationKey = buildCellValidationKey(rowId, criterionId);
    const nextValidationError = validateMatrixValue({
      value: nextValue,
      expressionDomain,
      alternativeName: alternativeNameById.get(rowId) || rowId,
      criterionName: criterionNameById.get(criterionId) || criterionId,
    });

    setValidationErrorsByCell((previousErrors) => {
      if (!nextValidationError && !previousErrors[validationKey]) {
        return previousErrors;
      }

      const nextErrors = { ...previousErrors };

      if (nextValidationError) {
        nextErrors[validationKey] = nextValidationError.message;
      } else {
        delete nextErrors[validationKey];
      }

      return nextErrors;
    });

    setEvaluationPayload((previousPayload) =>
      buildNextMatrixPayload({
        previousPayload,
        rowId,
        criterionId,
        expressionDomain,
        nextValue,
      })
    );
  };

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

  const renderCellWithCollective = ({ input, collectiveValue }) => (
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
        {input}
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

  const renderMatrixCell = ({ rowId, criterionId, cell }) => {
    const collectiveValue = getCollectiveDisplayValue(
      resolvedCollectivePayload?.[rowId]?.[criterionId]
    );
    const expressionDomain = cell.expressionDomain;
    const cellError =
      validationErrorsByCell[buildCellValidationKey(rowId, criterionId)] || "";

    return renderCellWithCollective({
      collectiveValue,
      input: (
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
                criterionId,
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
    });
  };

  // Grid configuration
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
      renderCell: (params) =>
        renderMatrixCell({
          rowId: params.row.id,
          criterionId: criterion.id,
          cell: params.row[criterion.id],
        }),
    })),
  ];

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
        rows={matrixRows}
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
