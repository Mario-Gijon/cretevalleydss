import { TextField } from "@mui/material";

export const NumericContinuousEvaluationInput = ({
  expressionDomain,
  value,
  onChange,
  disabled = false,
  error = false,
  helperText = "",
}) => {
  const definition =
    expressionDomain?.definition && typeof expressionDomain.definition === "object"
      ? expressionDomain.definition
      : {};

  return (
    <TextField
      type="number"
      value={value ?? ""}
      onChange={(event) => onChange?.(event.target.value)}
      disabled={disabled}
      error={Boolean(error)}
      helperText={helperText}
      fullWidth
      inputProps={{
        min: definition.min ?? undefined,
        max: definition.max ?? undefined,
      }}
    />
  );
};

export default NumericContinuousEvaluationInput;

