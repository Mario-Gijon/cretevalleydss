import { useEffect, useState } from "react";
import { Box, Stack } from "@mui/material";

import { ExpressionDomainEvaluationInput } from "../../../../../expressionDomains";
import { cellSx } from "../../alternativePairwiseByCriterion/styles/Cell.styles.js";
import {
  AHP_NORMALIZED_PREFERENCE_DECIMAL_PLACES,
  formatNormalizedPreference,
  normalizedPreferenceToSaatyValue,
} from "../operations/saatyPreference";

const AHP_NORMALIZED_PREFERENCE_EXPRESSION_DOMAIN = Object.freeze({
  typeKey: "numericContinuous",
  definition: Object.freeze({ min: 0, max: 1 }),
});

const AHP_PREFERENCE_ERROR =
  "Use a supported normalized Saaty value between 0 and 1 (exclusive).";

const ComparisonCell = ({
  rowCriterion,
  columnCriterion,
  value,
  diagonal,
  permitEdit,
  onChange,
}) => {
  const [invalidDraft, setInvalidDraft] = useState(false);

  useEffect(() => {
    setInvalidDraft(false);
  }, [value]);

  if (diagonal) {
    return (
      <Box sx={cellSx.diagonal} aria-label="Neutral self-comparison">
        Neutral
      </Box>
    );
  }

  const normalizedValue = formatNormalizedPreference(value);
  const inputId = `ahp-${rowCriterion.id}-${columnCriterion.id}`;
  const accessibleLabel = `Compare ${rowCriterion.name} with ${columnCriterion.name}`;
  const handleNormalizedChange = (nextValue) => {
    if (!permitEdit) return;

    if (nextValue === "") {
      setInvalidDraft(false);
      onChange(null);
      return;
    }

    const nextSaatyValue = normalizedPreferenceToSaatyValue(String(nextValue));
    if (nextSaatyValue === null) {
      // Keep the persisted judgment while NumericContinuousEvaluationInput
      // holds the user's temporary value locally.
      setInvalidDraft(true);
      return;
    }

    setInvalidDraft(false);
    onChange(nextSaatyValue);
  };

  return (
    <Stack direction="row" alignItems="center" sx={cellSx.container}>
      <Box sx={cellSx.value}>
        <Box
          sx={{
            ...cellSx.inputBoundary,
            "& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline": {
              borderColor: "error.main",
            },
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <ExpressionDomainEvaluationInput
            expressionDomain={AHP_NORMALIZED_PREFERENCE_EXPRESSION_DOMAIN}
            value={normalizedValue}
            onChange={handleNormalizedChange}
            disabled={!permitEdit}
            error={invalidDraft}
            helperText={AHP_PREFERENCE_ERROR}
            showHelperText={false}
            maxDecimalPlaces={AHP_NORMALIZED_PREFERENCE_DECIMAL_PLACES}
            inputProps={{
              id: inputId,
              "aria-label": accessibleLabel,
              title: invalidDraft ? AHP_PREFERENCE_ERROR : undefined,
            }}
          />
        </Box>
      </Box>
    </Stack>
  );
};

export default ComparisonCell;
