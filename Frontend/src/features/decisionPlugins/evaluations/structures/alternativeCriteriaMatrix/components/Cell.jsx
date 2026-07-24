import { Box, Chip, Stack } from "@mui/material";

import { ExpressionDomainEvaluationInput } from "../../../../../expressionDomains";
import { cellSx } from "./Cell.styles";
import { formatCollectiveValue } from "../operations/formatCollectiveValue";

const Cell = ({
  expressionDomain,
  value,
  collectiveValue,
  permitEdit,
  error,
  onChange,
}) => {
  const hasCollectiveValue = collectiveValue !== undefined;
  const collectivePresentation = hasCollectiveValue
    ? formatCollectiveValue({
        collectiveValue,
        expressionDomain,
      })
    : null;

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={cellSx.container}
    >
      <Box sx={cellSx.input}>
        <Box
          sx={cellSx.inputBoundary}
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
        <Box sx={cellSx.collective}>
          <Chip
            label={collectivePresentation.label}
            title={collectivePresentation.title}
            variant="outlined"
            size="small"
            sx={cellSx.chip}
            color="info"
          />
        </Box>
      ) : null}
    </Stack>
  );
};

export default Cell;
