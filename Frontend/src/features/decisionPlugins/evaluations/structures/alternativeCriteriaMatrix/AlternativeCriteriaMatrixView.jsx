import { useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Alert, Box, useTheme } from "@mui/material";

import { buildEvaluationMatrixDataGridSx } from "../../shared/styles/evaluationMatrixTable.styles";
import { isPlainObject } from "../../../../../utils/common/objects";
import { alternativeCriteriaMatrixViewSx } from "./styles/AlternativeCriteriaMatrixView.styles";
import Cell from "./components/Cell";
import { buildColumns } from "./operations/buildColumns";
import { buildRows } from "./operations/buildRows";
import { resolveCollective } from "./operations/resolveCollective";
import { updateValue } from "./operations/updateValue";
import { validateValue } from "./operations/validateValue";

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
        ? buildRows({
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
        payload: resolveCollective({
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

  const handleValueChange = ({ alternativeId, criterionId, nextValue }) => {
    const nextEvaluation = updateValue({
      evaluation,
      alternativeId,
      criterionId,
      nextValue,
    });

    setEvaluation(nextEvaluation);
  };

  const columns = buildColumns({
    criteria,
    renderCell: ({ rowId, criterion, value }) => {
      const validationMessage = validateValue({
        value,
        expressionDomain: criterion.expressionDomain,
      });

      return (
        <Cell
          expressionDomain={criterion.expressionDomain}
          value={value}
          collectiveValue={collectiveResolution.payload?.[rowId]?.[criterion.id]}
          permitEdit={permitEdit}
          error={validationMessage}
          onChange={(nextValue) =>
            handleValueChange({
              alternativeId: rowId,
              criterionId: criterion.id,
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
