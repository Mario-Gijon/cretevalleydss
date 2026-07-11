import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Alert,
  Box,
  Chip,
  Stack,
  useTheme,
} from "@mui/material";

import ExpressionDomainEvaluationInput from "../../../../expressionDomains/ExpressionDomainEvaluationInput.jsx";
import { validateExpressionDomainEvaluation } from "../../../../expressionDomains";
import { getExpressionDomainTypeMetadataOrThrow } from "../../../../expressionDomains/expressionDomainTypeMetadataCatalog.js";
import { formatCollectiveDisplayValue } from "../../shared/formatCollectiveDisplayValue";
import { buildEvaluationMatrixDataGridSx } from "../../shared/evaluationMatrixTable.styles";
import {
  requireCanonicalAlternativeCriteriaMatrix,
  resolveCanonicalCollectiveAlternativeCriteriaMatrix,
  updateAlternativeCriteriaMatrixCell,
} from "./alternativeCriteriaMatrix.helpers.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const resolveEvaluationAlternatives = (evaluationContext) => {
  if (!isPlainObject(evaluationContext)) {
    throw new Error("Evaluation context is invalid.");
  }

  if (!Array.isArray(evaluationContext.alternatives)) {
    throw new Error("Evaluation context alternatives must be an array.");
  }

  return evaluationContext.alternatives.map((alternative, index) => {
    const id = String(alternative?.id ?? alternative?._id ?? "").trim();
    const name = String(alternative?.name ?? "").trim();

    if (!id || !name) {
      throw new Error(`Evaluation context alternative ${index + 1} is invalid.`);
    }

    return { id, name };
  });
};

const resolveEvaluationCriteria = (evaluationContext) => {
  if (!isPlainObject(evaluationContext)) {
    throw new Error("Evaluation context is invalid.");
  }

  if (!Array.isArray(evaluationContext.leafCriteria)) {
    throw new Error("Evaluation context leafCriteria must be an array.");
  }

  return evaluationContext.leafCriteria.map((criterion, index) => {
    const id = String(criterion?.id ?? criterion?._id ?? "").trim();
    const name = String(criterion?.name ?? "").trim();
    const expressionDomain = criterion?.expressionDomain;

    if (!id || !name) {
      throw new Error(`Evaluation context criterion ${index + 1} is invalid.`);
    }

    if (!isPlainObject(expressionDomain)) {
      throw new Error(`Evaluation context criterion ${index + 1} expressionDomain is invalid.`);
    }

    const typeKey =
      typeof expressionDomain.typeKey === "string"
        ? expressionDomain.typeKey.trim()
        : "";

    if (!typeKey) {
      throw new Error(
        `Evaluation context criterion ${index + 1} expressionDomain type is invalid.`
      );
    }

    getExpressionDomainTypeMetadataOrThrow(typeKey);

    return {
      id,
      name,
      expressionDomain,
    };
  });
};

const hasCollectiveValue = (value) => value !== undefined;

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
  const shouldWithholdGrid = loading === true && evaluationPayload == null;

  const contextResolution = useMemo(() => {
    try {
      return {
        valid: true,
        alternatives: resolveEvaluationAlternatives(evaluationContext),
        criteria: resolveEvaluationCriteria(evaluationContext),
        message: "",
      };
    } catch (error) {
      return {
        valid: false,
        alternatives: [],
        criteria: [],
        message:
          error instanceof Error ? error.message : "Evaluation context is invalid.",
      };
    }
  }, [evaluationContext]);
  const alternativeItems = contextResolution.alternatives;
  const criteria = contextResolution.criteria;

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

  const payloadResolution = useMemo(() => {
    if (!contextResolution.valid || shouldWithholdGrid) {
      return {
        valid: contextResolution.valid,
        payload: null,
        message: contextResolution.message,
      };
    }

    try {
      return {
        valid: true,
        payload: requireCanonicalAlternativeCriteriaMatrix({
          alternatives: alternativeItems,
          criteria,
          evaluations: evaluationPayload,
        }),
        message: "",
      };
    } catch (error) {
      return {
        valid: false,
        payload: null,
        message:
          error instanceof Error ? error.message : "Evaluation payload is invalid.",
      };
    }
  }, [
    alternativeItems,
    contextResolution.message,
    contextResolution.valid,
    criteria,
    evaluationPayload,
    shouldWithholdGrid,
  ]);
  const collectiveResolution = useMemo(() => {
    if (!contextResolution.valid) {
      return {
        valid: true,
        payload: null,
        message: "",
      };
    }

    try {
      return {
        valid: true,
        payload: resolveCanonicalCollectiveAlternativeCriteriaMatrix({
          alternatives: alternativeItems,
          criteria,
          collectivePayload,
        }),
        message: "",
      };
    } catch (error) {
      return {
        valid: false,
        payload: null,
        message:
          error instanceof Error ? error.message : "Collective payload is invalid.",
      };
    }
  }, [alternativeItems, collectivePayload, contextResolution.valid, criteria]);

  const matrixRows = useMemo(
    () =>
      alternativeItems.map((alternative) => {
        const row = {
          id: alternative.id,
          alternativeLabel: alternative.name,
        };

        criteria.forEach((criterion) => {
          row[criterion.id] =
            payloadResolution.payload?.[alternative.id]?.[criterion.id]?.value;
        });

        return row;
      }),
    [alternativeItems, criteria, payloadResolution.payload]
  );
  const permitEdit = readOnly !== true && loading !== true;

  const validationResult = useMemo(() => {
    if (!payloadResolution.valid) {
      return {
        valid: false,
        errors: [],
      };
    }

    const errors = [];

    matrixRows.forEach((row) => {
      criteria.forEach((criterion) => {
        const validationError = validateMatrixValue({
          value: row[criterion.id],
          expressionDomain: criterion.expressionDomain,
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
  }, [criteria, matrixRows, payloadResolution.valid]);
  const validationErrorsMap = useMemo(
    () => buildValidationErrorMap(validationResult.errors),
    [validationResult.errors]
  );

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
      updateAlternativeCriteriaMatrixCell({
        alternatives: alternativeItems,
        criteria,
        evaluations: previousPayload,
        alternativeId: rowId,
        criterionId,
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

  const renderMatrixCell = ({ rowId, criterion, value }) => {
    const collectiveValue = collectiveResolution.payload?.[rowId]?.[criterion.id];
    const expressionDomain = criterion.expressionDomain;
    const cellError =
      validationErrorsByCell[buildCellValidationKey(rowId, criterion.id)] || "";

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
            value={value}
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
          />
        </Box>
      ),
    });
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
      renderCell: (params) =>
        renderMatrixCell({
          rowId: params.row.id,
          criterion,
          value: params.row[criterion.id],
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

      if (!payloadResolution.valid) {
        return {
          valid: false,
          errors: [
            {
              message: payloadResolution.message,
            },
          ],
        };
      }

      return validationResult;
    },
  }));

  if (shouldWithholdGrid) {
    return null;
  }

  if (!contextResolution.valid) {
    return <Alert severity="error">{contextResolution.message}</Alert>;
  }

  if (!payloadResolution.valid) {
    return <Alert severity="error">{payloadResolution.message}</Alert>;
  }

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
      {!collectiveResolution.valid ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {collectiveResolution.message}
        </Alert>
      ) : null}
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
