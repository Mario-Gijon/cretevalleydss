import { Alert, Box, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";

import {
  assertPairwiseReflectionCompatible,
  ExpressionDomainEvaluationInput,
} from "../../../../../expressionDomains";
import PairwiseDerivedValueDisplay from "./PairwiseDerivedValueDisplay.jsx";
import {
  requireCanonicalPairwiseEvaluations,
  updatePairwiseEvaluations,
} from "./pairwiseGrid.helpers.js";

const PairwiseAlternativesGrid = ({
  alternatives,
  expressionDomain,
  evaluations,
  setEvaluations,
  permitEdit = true,
}) => {
  const orderedAlternatives = Array.isArray(alternatives)
    ? alternatives.filter((alternative) => alternative?.id && alternative?.name)
    : [];

  try {
    assertPairwiseReflectionCompatible(expressionDomain);
  } catch (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : "Expression domain is invalid."}
      </Alert>
    );
  }

  let canonicalEvaluations = null;

  try {
    canonicalEvaluations = requireCanonicalPairwiseEvaluations({
      alternatives: orderedAlternatives,
      evaluations,
    });
  } catch (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : "Pairwise evaluations are invalid."}
      </Alert>
    );
  }

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Alternatives</TableCell>
            {orderedAlternatives.map((alternative) => (
              <TableCell key={alternative.id}>{alternative.name}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {orderedAlternatives.map((rowAlternative, rowIndex) => (
            <TableRow key={rowAlternative.id}>
              <TableCell component="th" scope="row">
                {rowAlternative.name}
              </TableCell>
              {orderedAlternatives.map((columnAlternative, columnIndex) => {
                if (rowAlternative.id === columnAlternative.id) {
                  return <TableCell key={columnAlternative.id}>Neutral</TableCell>;
                }

                const cell = canonicalEvaluations[rowAlternative.id][columnAlternative.id];
                const isUpperTriangle = rowIndex < columnIndex;

                return (
                  <TableCell key={columnAlternative.id}>
                    {isUpperTriangle ? (
                      <ExpressionDomainEvaluationInput
                        expressionDomain={expressionDomain}
                        value={cell.value}
                        onChange={(nextValue) => {
                          if (!permitEdit) {
                            return;
                          }

                          setEvaluations?.(
                            updatePairwiseEvaluations({
                              alternatives: orderedAlternatives,
                              evaluations: canonicalEvaluations,
                              rowAlternativeId: rowAlternative.id,
                              columnAlternativeId: columnAlternative.id,
                              nextValue,
                              expressionDomain,
                            })
                          );
                        }}
                        disabled={!permitEdit}
                        showHelperText={false}
                      />
                    ) : (
                      <PairwiseDerivedValueDisplay
                        cell={cell}
                        expressionDomain={expressionDomain}
                      />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default PairwiseAlternativesGrid;
