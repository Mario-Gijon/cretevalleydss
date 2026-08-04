import { Box, Chip, Stack } from "@mui/material";

import { ExpressionDomainEvaluationInput } from "../../../../../expressionDomains";
import { cellSx } from "../styles/Cell.styles";
import { formatCollectiveValue } from "../operations/formatCollectiveValue";

const Cell = ({
  value,
  collectiveValue,
  expressionDomain,
  diagonal,
  permitEdit,
  onChange,
}) => {
  if (diagonal) {
    return <Box sx={cellSx.diagonal}>Neutral</Box>;
  }

  const collectivePresentation =
    collectiveValue === undefined ||
    collectiveValue === null ||
    collectiveValue === ""
      ? null
      : formatCollectiveValue({
          collectiveValue,
          expressionDomain,
        });
  return (
    <Stack direction="row" alignItems="center" sx={cellSx.container}>
      <Box sx={cellSx.value}>
        <Box
          sx={cellSx.inputBoundary}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
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
            showHelperText={false}
          />
        </Box>
      </Box>
      {collectivePresentation ? (
        <Chip
          label={collectivePresentation.label}
          title={collectivePresentation.title}
          variant="outlined"
          color="info"
          size="small"
          sx={cellSx.chip}
        />
      ) : null}
    </Stack>
  );
};

export default Cell;
