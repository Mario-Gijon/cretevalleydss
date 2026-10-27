import { useEffect, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Alert, Box, Stack, Typography, useTheme } from "@mui/material";

import { buildEvaluationMatrixDataGridSx } from "../../shared/styles/evaluationMatrixTable.styles";
import {
  ALTERNATIVE_PAIRWISE_LABEL_COLUMN_MIN_WIDTH,
  EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH,
} from "../../shared/evaluationMatrixSizing.js";
import { buildPairwiseMatrixSx } from "../alternativePairwiseByCriterion/styles/PairwiseMatrix.styles.js";
import ComparisonCell from "./components/ComparisonCell";
import CollectiveAHPResult from "./components/CollectiveAHPResult";
import AHPConsistencyDiagnostic from "./components/AHPConsistencyDiagnostic";
import { expectedComparisonCount, validateEvaluation } from "./operations/validateEvaluation";
import { getOrientedComparisonValue, updateComparison } from "./operations/updateComparison";
import { resolveCollective } from "./operations/resolveCollective";
import { resolveCriteria } from "./operations/resolveCriteria";
import { resolveReviewCandidatePairs, isReviewCandidatePair } from "./operations/resolveReviewCandidatePairs.js";
import { useAHPConsistencyDiagnostic } from "./hooks/useAHPConsistencyDiagnostic.js";
import {
  criteriaPairwiseAHPViewSx,
} from "./styles/CriteriaPairwiseAHPView.styles";

const EMPTY_ITEMS = Object.freeze([]);

const CriteriaPairwiseAHPView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
  diagnosticContext,
  onConsistencyWarningChange,
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

  const currentEvaluation = evaluationResolution.payload;
  const diagnosticState = useAHPConsistencyDiagnostic({
    criteria,
    evaluation: currentEvaluation,
    diagnosticContext,
    readOnly,
  });
  const reviewCandidates = useMemo(() => {
    const data = diagnosticState?.data;
    if (
      diagnosticState?.status !== "result" ||
      typeof data?.consistencyRatio !== "number" ||
      data.consistencyRatio <= data.consistencyThreshold
    ) {
      return new Set();
    }
    return resolveReviewCandidatePairs(data);
  }, [diagnosticState]);
  const submitWarning = diagnosticState?.status === "result" &&
      typeof diagnosticState.data?.consistencyRatio === "number" &&
      diagnosticState.data.consistencyRatio > diagnosticState.data.consistencyThreshold
    ? `Your AHP comparisons have a consistency ratio of ${diagnosticState.data.consistencyRatio.toFixed(4)}, above the recommended ${diagnosticState.data.consistencyThreshold.toFixed(4)} threshold. You can still submit.`
    : null;

  useEffect(() => {
    onConsistencyWarningChange?.(submitWarning);
  }, [onConsistencyWarningChange, submitWarning]);

  if (criteriaResolution.message) {
    return <Alert severity="error">{criteriaResolution.message}</Alert>;
  }
  if (!criteria.length) {
    return <Typography variant="body2" sx={criteriaPairwiseAHPViewSx.empty}>No criteria available.</Typography>;
  }
  if (!evaluationResolution.payload && evaluationResolution.message) {
    return <Alert severity="error">{evaluationResolution.message}</Alert>;
  }

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
      minWidth: ALTERNATIVE_PAIRWISE_LABEL_COLUMN_MIN_WIDTH,
      width: ALTERNATIVE_PAIRWISE_LABEL_COLUMN_MIN_WIDTH,
      sortable: false,
      flex: 0,
    },
    ...criteria.map((columnCriterion) => ({
      field: columnCriterion.id,
      headerName: columnCriterion.name,
      minWidth: EVALUATION_MATRIX_VALUE_COLUMN_MIN_WIDTH,
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
        return (
          <ComparisonCell
            rowCriterion={rowCriterion}
            columnCriterion={columnCriterion}
            value={value}
            diagonal={diagonal}
            permitEdit={permitEdit}
            reviewCandidate={
              !diagonal &&
              isReviewCandidatePair(
                reviewCandidates,
                rowCriterion.id,
                columnCriterion.id,
              )
            }
            onChange={(nextValue) => {
              const nextEvaluation = updateComparison({
                evaluation: currentEvaluation,
                criterionId: rowCriterion.id,
                comparedCriterionId: columnCriterion.id,
                value: nextValue,
              });
              if (nextEvaluation !== currentEvaluation) {
                onConsistencyWarningChange?.(null);
                setEvaluation(nextEvaluation);
              }
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
          Criteria comparisons
        </Typography>
        {currentEvaluation ? (
          <Typography variant="caption" sx={criteriaPairwiseAHPViewSx.caption}>
            1 indicates equal importance. Values greater than 1 favour the row criterion; fractions favour the column criterion.
          </Typography>
        ) : null}
      </Box>
      {currentEvaluation ? <Stack direction="row" justifyContent="space-between" spacing={1} useFlexGap flexWrap="wrap">
        <Typography variant="caption" sx={criteriaPairwiseAHPViewSx.status} role="status">
          {criteria.length === 1
            ? "One criterion · no pairwise comparisons needed"
            : `${completedComparisons} of ${totalComparisons} comparisons complete`}
        </Typography>
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
            return rowIndex === columnIndex ? "diagonal-cell" : "pairwise-grid-cell";
          }}
          sx={buildPairwiseMatrixSx({
            theme,
            alternativeCount: criteria.length,
            buildSharedStyles: buildEvaluationMatrixDataGridSx,
          })}
        />
      </Box> : null}
      {!readOnly && diagnosticContext?.mode ? (
        <AHPConsistencyDiagnostic
          state={diagnosticState}
          onCheck={diagnosticState.checkConsistency}
        />
      ) : null}
    </Stack>
  );
};

export default CriteriaPairwiseAHPView;
