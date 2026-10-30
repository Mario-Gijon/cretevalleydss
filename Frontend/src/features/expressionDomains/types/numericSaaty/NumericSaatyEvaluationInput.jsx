import { MenuItem, TextField } from "@mui/material";

import { validateNumericSaatyEvaluation } from "./evaluation.js";
import {
  formatSaatyScaleLabel,
  getSaatyScaleValue,
  SAATY_SCALE_VALUES,
} from "./saatyScale.js";

export const NumericSaatyEvaluationInput = ({
  expressionDomain,
  value,
  onChange,
  disabled = false,
  error = false,
  helperText = "",
  inputProps = {},
}) => {
  const rawNumber = value === "" || value === null || value === undefined
    ? null
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : value;
  const selectedValue = getSaatyScaleValue(rawNumber);
  let validationMessage = "";
  if (rawNumber !== null) {
    try {
      validateNumericSaatyEvaluation({ value: rawNumber, expressionDomain });
    } catch (validationError) {
      validationMessage = validationError instanceof Error
        ? validationError.message
        : "Choose a value from Saaty's scale.";
    }
  }
  const unmatchedSavedValue = selectedValue === null && rawNumber !== null;

  return (
    <TextField
      select
      color="info"
      size="small"
      fullWidth
      disabled={disabled}
      error={Boolean(error) || Boolean(validationMessage)}
      value={selectedValue === null ? "" : String(selectedValue)}
      inputProps={inputProps}
      helperText={validationMessage || helperText}
      SelectProps={{
        displayEmpty: true,
        renderValue: (selected) => selected === ""
          ? unmatchedSavedValue
            ? `Unsupported saved value (${String(value)})`
            : "Choose"
          : formatSaatyScaleLabel(Number(selected)),
      }}
      onChange={(event) => {
        const nextValue = getSaatyScaleValue(Number(event.target.value));
        if (nextValue !== null) onChange?.(nextValue);
      }}
    >
      {SAATY_SCALE_VALUES.map((scaleValue) => (
        <MenuItem key={scaleValue} value={String(scaleValue)}>
          {formatSaatyScaleLabel(scaleValue)}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default NumericSaatyEvaluationInput;
