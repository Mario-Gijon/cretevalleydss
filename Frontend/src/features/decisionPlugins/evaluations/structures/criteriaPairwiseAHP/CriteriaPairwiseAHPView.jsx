import { useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Alert, Box, Stack, Typography, useTheme } from "@mui/material";

import { buildEvaluationMatrixDataGridSx } from "../../shared/styles/evaluationMatrixTable.styles";
import ComparisonCell from "./components/ComparisonCell";
import CollectiveAHPResult from "./components/CollectiveAHPResult";
import { expectedComparisonCount, validateEvaluation } from "./operations/validateEvaluation";
import { getOrientedComparisonValue, updateComparison } from "./operations/updateComparison";
import { resolveCollective } from "./operations/resolveCollective";
import { resolveCriteria } from "./operations/resolveCriteria";
import {
  buildCriteriaPairwiseAHPGridSx,
  criteriaPairwiseAHPViewSx,
} from "./styles/CriteriaPairwiseAHPView.styles";

const EMPTY_ITEMS = Object.freeze([]);

const CriteriaPairwiseAHPView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
}) => {
  const theme = useTheme();
  const criteriaResolution = useMemo(() => {
    try {
      return { criteria: resolveCriteria({ decisionContext }), message: "" };
    } catch (error) {
      return {
        criteria: null,
        message: error instanceof Error ? error.message : "AHP criteria are invalid.",
      };
    }
  }, [decisionContext]);
  const criteria = criteriaResolution.criteria || EMPTY_ITEMS;
  const collectiveResolution = useMemo(() => {
    try {
      return {
        payload: resolveCollective({ criteria, collectiveEvaluation }),
        message: "",
      };
    } catch (error) {
      return {
        payload: null,
        message: error instanceof Error ? error.message : "AHP collective result is invalid.",
      };
    }
  }, [collectiveEvaluation, criteria]);
  const evaluationResolution = useMemo(() => {
    if (!criteriaResolution.criteria) return { payload: null, message: "" };
    if (
      readOnly === true &&
      (!evaluation || !Array.isArray(evaluation.comparisons)) &&
      collectiveResolution.payload
    ) {
      return { payload: null, message: "" };
    }
    try {
      return {
        payload: validateEvaluation({ decisionContext, evaluation }),
        message: "",
      };
    } catch (error) {
      return {
        payload: null,
        message: error instanceof Error ? error.message : "AHP evaluation is invalid.",
      };
    }
  }, [criteriaResolution.criteria, decisionContext, evaluation, collectiveResolution.payload, readOnly]);

  if (criteriaResolution.message) {
    return <Alert severity="error">{criteriaResolution.message}</Alert>;
  }
  if (!criteria.length) {
    return <Typography variant="body2" sx={criteriaPairwiseAHPViewSx.empty}>No criteria available.</Typography>;
  }
  if (!evaluationResolution.payload && evaluationResolution.message) {
    return <Alert severity="error">{evaluationResolution.message}</Alert>;
  }

  const currentEvaluation = evaluationResolution.payload;
  const permitEdit = readOnly !== true;
  const totalComparisons = expectedComparisonCount(criteria.length);
  const completedComparisons = currentEvaluation?.comparisons.length ?? 0;
  const rows = currentEvaluation ? criteria.map((criterion) => ({
    id: criterion.id,
    criterionLabel: criterion.name,
  })) : [];
  const columns = [
    {
      field: "criterionLabel",
      headerName: "Criteria",
      minWidth: 220,
      width: 220,
      sortable: false,
      flex: 0,
    },
    ...criteria.map((columnCriterion) => ({
      field: columnCriterion.id,
      headerName: columnCriterion.name,
      minWidth: 150,
      flex: 1,
      sortable: false,
      renderCell: (params) => {
        const rowCriterion = criteria.find((criterion) => criterion.id === params.row.id);
        const value = getOrientedComparisonValue({
          comparisons: currentEvaluation?.comparisons,
          criterionId: rowCriterion.id,
          comparedCriterionId: columnCriterion.id,
        });
        const diagonal = rowCriterion.id === columnCriterion.id;
        const editable = rowCriterion.index < columnCriterion.index;
        return (
          <ComparisonCell
            rowCriterion={rowCriterion}
            columnCriterion={columnCriterion}
            value={value}
            diagonal={diagonal}
            editable={editable}
            permitEdit={permitEdit}
            onChange={(nextValue) => {
              const nextEvaluation = updateComparison({
                evaluation: currentEvaluation,
                criterionId: rowCriterion.id,
                comparedCriterionId: columnCriterion.id,
                value: nextValue,
              });
              if (nextEvaluation !== currentEvaluation) setEvaluation(nextEvaluation);
            }}
          />
        );
      },
    })),
  ];

  return (
    <Stack spacing={1.1} sx={criteriaPairwiseAHPViewSx.container}>
      {collectiveResolution.message ? (
        <Alert severity="error">{collectiveResolution.message}</Alert>
      ) : null}
      {collectiveResolution.payload ? (
        <CollectiveAHPResult criteria={criteria} result={collectiveResolution.payload} />
      ) : null}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
          Pairwise criteria comparisons
        </Typography>
        {currentEvaluation ? (
          <Typography variant="caption" sx={criteriaPairwiseAHPViewSx.caption}>
            Compare the row criterion with the column criterion. The opposite half is reciprocal.
          </Typography>
        ) : null}
      </Box>
      {currentEvaluation ? <Stack direction="row" justifyContent="space-between" spacing={1} useFlexGap flexWrap="wrap">
        <Typography variant="caption" sx={criteriaPairwiseAHPViewSx.status} role="status">
          {criteria.length === 1
            ? "One criterion · no pairwise comparisons needed"
            : `${completedComparisons} of ${totalComparisons} comparisons complete`}
        </Typography>
        {criteria.length > 1 ? (
          <Typography variant="caption" sx={criteriaPairwiseAHPViewSx.caption}>
            Saaty scale: 1–9 and reciprocal values
          </Typography>
        ) : null}
      </Stack> : null}
      {currentEvaluation ? <Box sx={criteriaPairwiseAHPViewSx.matrixViewport}>
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          density="compact"
          hideFooter
          disableColumnMenu
          disableColumnFilter
          disableColumnSorting
          disableColumnSelector
          disableRowSelectionOnClick
          getRowId={(row) => row.id}
          getCellClassName={(params) => {
            if (params.field === "criterionLabel") return "first-column";
            const rowIndex = criteria.findIndex((criterion) => criterion.id === params.row.id);
            const columnIndex = criteria.findIndex((criterion) => criterion.id === params.field);
            if (rowIndex === columnIndex) return "diagonal-cell";
            return rowIndex > columnIndex ? "derived-cell" : "editable-cell";
          }}
          sx={{
            ...buildEvaluationMatrixDataGridSx(theme),
            ...buildCriteriaPairwiseAHPGridSx(theme, criteria.length),
          }}
        />
      </Box> : null}
    </Stack>
  );
};

export default CriteriaPairwiseAHPView;
