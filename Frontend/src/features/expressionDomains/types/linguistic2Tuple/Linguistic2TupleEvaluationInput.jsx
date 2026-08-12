import { MenuItem, TextField } from "@mui/material";

export const Linguistic2TupleEvaluationInput = ({
  expressionDomain,
  value,
  onChange,
  disabled = false,
  error = false,
  helperText = "",
  showHelperText = true,
}) => {
  const labels = Array.isArray(expressionDomain?.definition?.labels)
    ? expressionDomain.definition.labels
    : [];
  const labelKey = typeof value?.labelKey === "string" ? value.labelKey : "";

  return (
    <TextField
      select
      color="info"
      value={labelKey}
      onChange={(event) => onChange?.({ labelKey: event.target.value, alpha: 0 })}
      disabled={disabled}
      error={Boolean(error)}
      helperText={showHelperText ? helperText : ""}
      fullWidth
    >
      {labels.map((labelItem) => (
        <MenuItem key={labelItem.key} value={labelItem.key}>
          {labelItem.label}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default Linguistic2TupleEvaluationInput;
