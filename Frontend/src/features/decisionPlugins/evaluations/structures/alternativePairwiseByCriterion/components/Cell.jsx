import { Box, Chip, Stack } from "@mui/material";

import { ExpressionDomainEvaluationInput } from "../../../../../expressionDomains";
import { cellSx } from "./Cell.styles";
import { formatCollectiveValue } from "../operations/formatCollectiveValue";
import { formatValue } from "../operations/formatValue";

const Cell = ({
  value,
  collectiveValue,
  expressionDomain,
  diagonal,
  editable,
  permitEdit,
  error,
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
  const derivedPresentation = editable
    ? null
    : formatValue({ value, expressionDomain });

  return (
    <Stack direction="row" alignItems="center" sx={cellSx.container}>
      <Box sx={cellSx.value}>
        {editable ? (
          <Box
            sx={cellSx.inputBoundary}
            title={error || undefined}
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
              error={Boolean(error)}
              showHelperText={false}
            />
          </Box>
        ) : (
          <Box
            component="span"
            title={derivedPresentation.tooltip || undefined}
            sx={cellSx.derived}
          >
            {derivedPresentation.text}
          </Box>
        )}
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
