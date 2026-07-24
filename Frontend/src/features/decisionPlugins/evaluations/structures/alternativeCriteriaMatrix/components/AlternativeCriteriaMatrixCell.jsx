import { Box, Chip, Stack } from "@mui/material";

import { ExpressionDomainEvaluationInput } from "../../../../../expressionDomains";
import { alternativeCriteriaMatrixCellSx } from "./AlternativeCriteriaMatrixCell.styles";
import { formatAlternativeCriteriaCollectiveValue } from "../operations/formatAlternativeCriteriaCollectiveValue";

const AlternativeCriteriaMatrixCell = ({
  expressionDomain,
  value,
  collectiveValue,
  permitEdit,
  error,
  onChange,
}) => {
  const hasCollectiveValue = collectiveValue !== undefined;
  const collectivePresentation = hasCollectiveValue
    ? formatAlternativeCriteriaCollectiveValue({
        collectiveValue,
        expressionDomain,
      })
    : null;

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={alternativeCriteriaMatrixCellSx.container}
    >
      <Box sx={alternativeCriteriaMatrixCellSx.input}>
        <Box
          sx={alternativeCriteriaMatrixCellSx.inputBoundary}
          title={error || undefined}
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
              if (permitEdit) {
                onChange(nextValue);
              }
            }}
            disabled={!permitEdit}
            error={Boolean(error)}
            showHelperText={false}
          />
        </Box>
      </Box>
      {collectivePresentation ? (
        <Box sx={alternativeCriteriaMatrixCellSx.collective}>
          <Chip
            label={collectivePresentation.label}
            title={collectivePresentation.title}
            variant="outlined"
            size="small"
            sx={alternativeCriteriaMatrixCellSx.chip}
            color="info"
          />
        </Box>
      ) : null}
    </Stack>
  );
};

export default AlternativeCriteriaMatrixCell;
