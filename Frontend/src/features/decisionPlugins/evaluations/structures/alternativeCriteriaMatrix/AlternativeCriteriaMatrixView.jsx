import { useMemo, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Alert, Box, useTheme } from "@mui/material";

import { buildEvaluationMatrixDataGridSx } from "../../shared/evaluationMatrixTable.styles";
import { alternativeCriteriaMatrixViewSx } from "./AlternativeCriteriaMatrixView.styles";
import AlternativeCriteriaMatrixCell from "./components/AlternativeCriteriaMatrixCell";
import { buildAlternativeCriteriaMatrixColumns } from "./operations/buildAlternativeCriteriaMatrixColumns";
import { buildAlternativeCriteriaMatrixRows } from "./operations/buildAlternativeCriteriaMatrixRows";
import {
  resolveDecisionAlternatives,
  resolveDecisionCriteria,
} from "./operations/resolveAlternativeCriteriaMatrixContext";
import {
  resolveCanonicalCollectiveAlternativeCriteriaMatrix,
} from "./operations/resolveCollectiveAlternativeCriteriaMatrix";
import { updateAlternativeCriteriaMatrixCell } from "./operations/updateAlternativeCriteriaMatrixCell";
import { requireCanonicalAlternativeCriteriaMatrix } from "./operations/validateAlternativeCriteriaMatrix";
import {
  buildAlternativeCriteriaMatrixCellKey,
  buildAlternativeCriteriaMatrixErrorMap,
  validateAlternativeCriteriaMatrixValue,
} from "./operations/validateAlternativeCriteriaMatrixValues";

const AlternativeCriteriaMatrixView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
  loading,
}) => {
  const theme = useTheme();
  const [validationErrorsByCell, setValidationErrorsByCell] = useState({});
  const shouldWithholdGrid = loading === true && evaluation == null;

  const contextResolution = useMemo(() => {
    try {
      return {
        valid: true,
        alternatives: resolveDecisionAlternatives(decisionContext),
        criteria: resolveDecisionCriteria(decisionContext),
        message: "",
      };
    } catch (error) {
      return {
        valid: false,
        alternatives: [],
        criteria: [],
        message:
          error instanceof Error ? error.message : "Decision context is invalid.",
      };
    }
  }, [decisionContext]);
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
          evaluations: evaluation,
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
    evaluation,
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
          collectiveEvaluation,
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
  }, [alternativeItems, collectiveEvaluation, contextResolution.valid, criteria]);

  const matrixRows = useMemo(
    () =>
      buildAlternativeCriteriaMatrixRows({
        alternatives: alternativeItems,
        criteria,
        evaluation: payloadResolution.payload,
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
        const validationError = validateAlternativeCriteriaMatrixValue({
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
    () => buildAlternativeCriteriaMatrixErrorMap(validationResult.errors),
    [validationResult.errors]
  );

  const updateCellValue = ({ rowId, criterionId, expressionDomain, nextValue }) => {
    const validationKey = buildAlternativeCriteriaMatrixCellKey(
      rowId,
      criterionId
    );
    const nextValidationError = validateAlternativeCriteriaMatrixValue({
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

    const nextEvaluation = updateAlternativeCriteriaMatrixCell({
      alternatives: alternativeItems,
      criteria,
      evaluations: evaluation,
      alternativeId: rowId,
      criterionId,
      nextValue,
    });
    setEvaluation(nextEvaluation);
  };

  const renderMatrixCell = ({ rowId, criterion, value }) => {
    const collectiveValue = collectiveResolution.payload?.[rowId]?.[criterion.id];
    const expressionDomain = criterion.expressionDomain;
    const cellError =
      validationErrorsByCell[
        buildAlternativeCriteriaMatrixCellKey(rowId, criterion.id)
      ] ||
      validationErrorsMap[
        buildAlternativeCriteriaMatrixCellKey(rowId, criterion.id)
      ] ||
      "";

    return (
      <AlternativeCriteriaMatrixCell
        expressionDomain={expressionDomain}
        value={value}
        collectiveValue={collectiveValue}
        permitEdit={permitEdit}
        error={cellError}
        onChange={(nextValue) =>
          updateCellValue({
            rowId,
            criterionId: criterion.id,
            expressionDomain,
            nextValue,
          })
        }
      />
    );
  };

  const columns = buildAlternativeCriteriaMatrixColumns({
    criteria,
    renderCell: renderMatrixCell,
  });

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
    <Box sx={alternativeCriteriaMatrixViewSx}>
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

export default AlternativeCriteriaMatrixView;
