import { useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Alert, Box, useTheme } from "@mui/material";

import { buildEvaluationMatrixDataGridSx } from "../../shared/evaluationMatrixTable.styles";
import { isPlainObject } from "../../../../../utils/common/objects";
import { alternativeCriteriaMatrixViewSx } from "./AlternativeCriteriaMatrixView.styles";
import AlternativeCriteriaMatrixCell from "./components/AlternativeCriteriaMatrixCell";
import { buildAlternativeCriteriaMatrixColumns } from "./operations/buildAlternativeCriteriaMatrixColumns";
import { buildAlternativeCriteriaMatrixRows } from "./operations/buildAlternativeCriteriaMatrixRows";
import { resolveCollectiveAlternativeCriteriaMatrix } from "./operations/resolveCollectiveAlternativeCriteriaMatrix";
import { updateAlternativeCriteriaMatrixValue } from "./operations/updateAlternativeCriteriaMatrixValue";
import { validateAlternativeCriteriaMatrixValue } from "./operations/validateAlternativeCriteriaMatrixValue";

const AlternativeCriteriaMatrixView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
  loading,
}) => {
  const theme = useTheme();
  const alternatives = decisionContext.alternatives;
  const criteria = decisionContext.leafCriteria;
  const hasEvaluation = isPlainObject(evaluation);
  const isWaitingForEvaluation = loading === true && evaluation == null;
  const permitEdit = readOnly !== true && loading !== true;

  const matrixRows = useMemo(
    () =>
      hasEvaluation
        ? buildAlternativeCriteriaMatrixRows({
            alternatives,
            criteria,
            evaluation,
          })
        : [],
    [alternatives, criteria, evaluation, hasEvaluation]
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

  if (isWaitingForEvaluation) {
    return null;
  }

  if (!hasEvaluation) {
    return <Alert severity="error">Evaluation payload is invalid.</Alert>;
  }

  const updateValue = ({ alternativeId, criterion, nextValue }) => {
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
      const validationError = validateAlternativeCriteriaMatrixValue({
        value,
        expressionDomain: criterion.expressionDomain,
      });

      return (
        <AlternativeCriteriaMatrixCell
          expressionDomain={criterion.expressionDomain}
          value={value}
          collectiveValue={collectiveResolution.payload?.[rowId]?.[criterion.id]}
          permitEdit={permitEdit}
          error={validationError}
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

export default AlternativeCriteriaMatrixView;
