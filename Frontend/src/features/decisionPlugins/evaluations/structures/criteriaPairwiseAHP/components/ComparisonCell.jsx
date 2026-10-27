import { Box, MenuItem, Stack, TextField } from "@mui/material";

import { cellSx } from "../../alternativePairwiseByCriterion/styles/Cell.styles.js";
import {
  getSaatyNormalizedPreferenceOption,
  SAATY_NORMALIZED_PREFERENCE_OPTIONS,
} from "../operations/saatyPreference";

const ComparisonCell = ({
  rowCriterion,
  columnCriterion,
  value,
  diagonal,
  permitEdit,
  onChange,
}) => {
  if (diagonal) {
    return (
      <Box sx={cellSx.diagonal} aria-label="Neutral self-comparison">
        1 — Neutral
      </Box>
    );
  }

  const selectedOption = value === ""
    ? null
    : getSaatyNormalizedPreferenceOption(value);
  const accessibleLabel = `Compare ${rowCriterion.name} with ${columnCriterion.name}`;
  const handleKeyDown = (event) => {
    if (
      !permitEdit ||
      !selectedOption ||
      !["Backspace", "Delete"].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onChange(null);
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
          onKeyDown={handleKeyDown}
        >
          <TextField
            select
            color="info"
            value={selectedOption?.normalizedValue ?? ""}
            onChange={(event) => {
              const option = SAATY_NORMALIZED_PREFERENCE_OPTIONS.find(
                (candidate) => candidate.normalizedValue === event.target.value
              );
              if (permitEdit && option) onChange(option.saatyValue);
            }}
            disabled={!permitEdit}
            error={value !== "" && selectedOption === null}
            fullWidth
            inputProps={{ "aria-label": accessibleLabel }}
            SelectProps={{ displayEmpty: true }}
          >
            {SAATY_NORMALIZED_PREFERENCE_OPTIONS.map((option) => (
              <MenuItem key={option.saatyValue} value={option.normalizedValue}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>
    </Stack>
  );
};

export default ComparisonCell;
