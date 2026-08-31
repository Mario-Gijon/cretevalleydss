import { MenuItem, TextField, Typography } from "@mui/material";

import { formatLinguistic2TupleEvaluation } from "./evaluation";

export const Linguistic2TupleEvaluationInput = ({
  expressionDomain,
  value,
  onChange,
  disabled = false,
  error = false,
  helperText = "",
  showHelperText = true,
  collectiveValue,
}) => {
  const labels = Array.isArray(expressionDomain?.definition?.labels)
    ? expressionDomain.definition.labels
    : [];
  const labelKey = typeof value?.labelKey === "string" ? value.labelKey : "";
  const collectivePresentation = disabled
    ? formatLinguistic2TupleEvaluation({
        value: collectiveValue,
        expressionDomain,
      })
    : null;

  if (collectivePresentation) {
    return (
      <Typography variant="body2" noWrap title={collectivePresentation}>
        {collectivePresentation}
      </Typography>
    );
  }

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
