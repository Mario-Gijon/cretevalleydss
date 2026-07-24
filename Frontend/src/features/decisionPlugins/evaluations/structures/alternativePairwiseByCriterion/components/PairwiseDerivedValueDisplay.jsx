import { Box } from "@mui/material";

import { describePairwiseCellValue } from "../operations/describeAlternativePairwiseValue";

const PairwiseDerivedValueDisplay = ({ cell, expressionDomain }) => {
  const { text, tooltip } = describePairwiseCellValue({
    cell,
    expressionDomain,
  });

  return (
    <Box
      component="span"
      title={tooltip || undefined}
      sx={{
        display: "inline-block",
        minHeight: 24,
        lineHeight: 1.5,
      }}
    >
      {text}
    </Box>
  );
};

export default PairwiseDerivedValueDisplay;
