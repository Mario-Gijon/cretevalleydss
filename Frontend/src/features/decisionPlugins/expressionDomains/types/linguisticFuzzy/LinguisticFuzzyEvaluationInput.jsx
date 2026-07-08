import { MenuItem, TextField } from "@mui/material";
import { normalizeLabelKeyValue } from "../../expressionDomainDraftFields";

export const LinguisticFuzzyEvaluationInput = ({
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
  const labelKey = normalizeLabelKeyValue(value);

  return (
    <TextField
      select
      color="info"
      value={labelKey}
      onChange={(event) => onChange?.({ labelKey: event.target.value })}
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

export default LinguisticFuzzyEvaluationInput;
