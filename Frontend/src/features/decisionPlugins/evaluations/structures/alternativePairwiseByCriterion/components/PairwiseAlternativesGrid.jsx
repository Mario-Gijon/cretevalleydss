import { DataGrid } from "@mui/x-data-grid";
import { Alert, Box, Chip, Stack, useTheme } from "@mui/material";

import {
  assertPairwiseReflectionCompatible,
  ExpressionDomainEvaluationInput,
  findMatchingFuzzyLabel,
} from "../../../../../expressionDomains";
import { formatCollectiveDisplayValue } from "../../../shared/formatCollectiveDisplayValue";
import { buildEvaluationMatrixDataGridSx } from "../../../shared/evaluationMatrixTable.styles";
import PairwiseDerivedValueDisplay from "./PairwiseDerivedValueDisplay.jsx";
import {
  buildPairwiseAlternativesDataGridSx,
  pairwiseAlternativesGridSx,
} from "./PairwiseAlternativesGrid.styles.js";
import {
  describePairwiseCellValue,
} from "../operations/describeAlternativePairwiseValue";
import { updatePairwiseEvaluations } from "../operations/updateAlternativePairwiseComparison";
import { requireCanonicalPairwiseEvaluations } from "../operations/validateAlternativePairwiseEvaluation";

const formatCollectiveChip = ({ value, expressionDomain }) => {
  if (expressionDomain?.typeKey === "linguisticFuzzy" && Array.isArray(value)) {
    const match = findMatchingFuzzyLabel({ values: value, expressionDomain });
    const vector = formatCollectiveDisplayValue(value);
    return { label: match?.label || vector, title: match ? `${match.label} — ${vector}` : vector };
  }

  if (expressionDomain?.typeKey === "linguisticOrdinal") {
    const presentation = describePairwiseCellValue({ cell: { value }, expressionDomain });
    return { label: presentation.text, title: presentation.tooltip || undefined };
  }

  const label = formatCollectiveDisplayValue(value);
  return { label, title: Array.isArray(value) ? label : undefined };
};

const PairwiseAlternativesGrid = ({
  alternatives,
  expressionDomain,
  evaluations,
  collectiveEvaluations = null,
  setEvaluations,
  permitEdit = true,
}) => {
  const theme = useTheme();
  const orderedAlternatives = Array.isArray(alternatives)
    ? alternatives.filter((alternative) => alternative?.id && alternative?.name)
    : [];

  try {
    assertPairwiseReflectionCompatible(expressionDomain);
  } catch (error) {
    return <Alert severity="error">{error instanceof Error ? error.message : "Expression domain is invalid."}</Alert>;
  }

  let canonicalEvaluations = null;
  try {
    canonicalEvaluations = requireCanonicalPairwiseEvaluations({ alternatives: orderedAlternatives, evaluations });
  } catch (error) {
    return <Alert severity="error">{error instanceof Error ? error.message : "Pairwise evaluations are invalid."}</Alert>;
  }

  const rows = orderedAlternatives.map((rowAlternative) => ({
    id: rowAlternative.id,
    alternativeLabel: rowAlternative.name,
    ...canonicalEvaluations[rowAlternative.id],
  }));
  const collective = collectiveEvaluations || {};
  const columns = [
    { field: "alternativeLabel", headerName: "Alternatives", minWidth: 150, flex: 1, sortable: false },
    ...orderedAlternatives.map((alternative) => ({
      field: alternative.id,
      headerName: alternative.name,
      minWidth: 150,
      flex: 1,
      sortable: false,
      renderCell: (params) => {
        const rowId = params.row.id;
        const diagonal = rowId === alternative.id;
        if (diagonal) return "Neutral";
        const upper = orderedAlternatives.findIndex((item) => item.id === rowId) < orderedAlternatives.findIndex((item) => item.id === alternative.id);
        const cell = params.row[alternative.id];
        const collectiveValue = collective?.[rowId]?.[alternative.id];
        const collectiveChip = collectiveValue === undefined || collectiveValue === null || collectiveValue === ""
          ? null
          : formatCollectiveChip({ value: collectiveValue, expressionDomain });

        return (
          <Stack direction="row" alignItems="center" spacing={0.75} sx={pairwiseAlternativesGridSx.cell}>
            <Box sx={pairwiseAlternativesGridSx.value}>
              {upper ? (
                <Box
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  sx={pairwiseAlternativesGridSx.input}
                >
                  <ExpressionDomainEvaluationInput
                    expressionDomain={expressionDomain}
                    value={cell.value}
                    onChange={(nextValue) => {
                      if (!permitEdit) return;
                      setEvaluations?.(updatePairwiseEvaluations({
                        alternatives: orderedAlternatives,
                        evaluations: canonicalEvaluations,
                        rowAlternativeId: rowId,
                        columnAlternativeId: alternative.id,
                        nextValue,
                        expressionDomain,
                      }));
                    }}
                    disabled={!permitEdit}
                    showHelperText={false}
                  />
                </Box>
              ) : <PairwiseDerivedValueDisplay cell={cell} expressionDomain={expressionDomain} />}
            </Box>
            {collectiveChip ? <Chip label={collectiveChip.label} title={collectiveChip.title} variant="outlined" color="info" size="small" sx={pairwiseAlternativesGridSx.chip} /> : null}
          </Stack>
        );
      },
    })),
  ];

  return (
    <Box sx={pairwiseAlternativesGridSx.container}>
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
        getCellClassName={(params) => params.field === "alternativeLabel" ? "first-column" : params.row.id === params.field ? "diagonal-cell" : "pairwise-grid-cell"}
        sx={buildPairwiseAlternativesDataGridSx({
          theme,
          alternativeCount: orderedAlternatives.length,
          buildSharedStyles: buildEvaluationMatrixDataGridSx,
        })}
      />
    </Box>
  );
};

export default PairwiseAlternativesGrid;
