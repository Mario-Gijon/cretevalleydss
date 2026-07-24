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
import { resolveCollectiveAlternativeCriteriaMatrix } from "./operations/resolveCollectiveAlternativeCriteriaMatrix";
import { updateAlternativeCriteriaMatrixValue } from "./operations/updateAlternativeCriteriaMatrixValue";
import {
  buildAlternativeCriteriaMatrixCellKey,
  buildAlternativeCriteriaMatrixErrorMap,
  validateAlternativeCriteriaMatrixValue,
} from "./operations/validateAlternativeCriteriaMatrixValue";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const AlternativeCriteriaMatrixContent = ({
  alternatives,
  criteria,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
  loading,
}) => {
  const theme = useTheme();
  const [validationErrorsByCell, setValidationErrorsByCell] = useState({});
  const permitEdit = readOnly !== true && loading !== true;

  const alternativeNameById = useMemo(
    () =>
      new Map(
        alternatives.map((alternative) => [alternative.id, alternative.name])
      ),
    [alternatives]
  );
  const matrixRows = useMemo(
    () =>
      buildAlternativeCriteriaMatrixRows({
        alternatives,
        criteria,
        evaluation,
      }),
    [alternatives, criteria, evaluation]
  );
  const collectiveResolution = useMemo(() => {
    try {
      return {
        payload: resolveCollectiveAlternativeCriteriaMatrix({
          alternatives,
          criteria,
          collectiveEvaluation,
        }),
        message: "",
      };
    } catch (error) {
      return {
        payload: null,
        message:
          error instanceof Error ? error.message : "Collective payload is invalid.",
      };
    }
  }, [alternatives, collectiveEvaluation, criteria]);

  const validationErrorsMap = useMemo(() => {
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
            criterionId: criterion.id,
            message: validationError.message,
          });
        }
      });
    });

    return buildAlternativeCriteriaMatrixErrorMap(errors);
  }, [criteria, matrixRows]);

  const updateValue = ({
    alternativeId,
    criterion,
    nextValue,
  }) => {
    const validationKey = buildAlternativeCriteriaMatrixCellKey(
      alternativeId,
      criterion.id
    );
    const validationError = validateAlternativeCriteriaMatrixValue({
      value: nextValue,
      expressionDomain: criterion.expressionDomain,
      alternativeName: alternativeNameById.get(alternativeId),
      criterionName: criterion.name,
    });

    setValidationErrorsByCell((previousErrors) => {
      const nextErrors = { ...previousErrors };

      if (validationError) {
        nextErrors[validationKey] = validationError.message;
      } else {
        delete nextErrors[validationKey];
      }

      return nextErrors;
    });

    const nextEvaluation = updateAlternativeCriteriaMatrixValue({
      evaluation,
      alternativeId,
      criterionId: criterion.id,
      nextValue,
    });
    setEvaluation(nextEvaluation);
  };

  const columns = buildAlternativeCriteriaMatrixColumns({
    criteria,
    renderCell: ({ rowId, criterion, value }) => {
      const validationKey = buildAlternativeCriteriaMatrixCellKey(
        rowId,
        criterion.id
      );

      return (
        <AlternativeCriteriaMatrixCell
          expressionDomain={criterion.expressionDomain}
          value={value}
          collectiveValue={
            collectiveResolution.payload?.[rowId]?.[criterion.id]
          }
          permitEdit={permitEdit}
          error={
            validationErrorsByCell[validationKey] ||
            validationErrorsMap[validationKey] ||
            ""
          }
          onChange={(nextValue) =>
            updateValue({
              alternativeId: rowId,
              criterion,
              nextValue,
            })
          }
        />
      );
    },
  });

  return (
    <Box sx={alternativeCriteriaMatrixViewSx}>
      {collectiveResolution.message ? (
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
        sx={buildEvaluationMatrixDataGridSx(theme)}
      />
    </Box>
  );
};

const AlternativeCriteriaMatrixView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
  loading,
}) => {
  if (loading === true && evaluation == null) {
    return null;
  }

  try {
    if (!isPlainObject(evaluation)) {
      throw new Error("Evaluation payload is invalid.");
    }

    return (
      <AlternativeCriteriaMatrixContent
        alternatives={resolveDecisionAlternatives(decisionContext)}
        criteria={resolveDecisionCriteria(decisionContext)}
        evaluation={evaluation}
        setEvaluation={setEvaluation}
        collectiveEvaluation={collectiveEvaluation}
        readOnly={readOnly}
        loading={loading}
      />
    );
  } catch (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : "Decision context is invalid."}
      </Alert>
    );
  }
};

export default AlternativeCriteriaMatrixView;
