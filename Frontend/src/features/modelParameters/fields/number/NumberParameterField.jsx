import { Stack, Typography, TextField, MenuItem } from "@mui/material";
import { handleNumberInput } from "../../../../utils/handleTwoDecimals";

export const NumberParameterField = ({
  parameter,
  paramKey,
  paramLabel,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
}) => {
  const restrictions = parameter?.restrictions || {};
  const defaultValue = parameter?.default;

  if (parameter?.type === "number" && Array.isArray(restrictions?.allowed)) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body1">{paramLabel}:</Typography>
        <TextField
          select
          size="small"
          value={paramValues[paramKey] ?? defaultValue ?? ""}
          onChange={(e) => {
            setParamValues((prev) => ({
              ...prev,
              [paramKey]: handleNumberInput(e.target.value),
            }));
            if (defaultModelParams) setDefaultModelParams(false);
          }}
          inputProps={{ min: 0, max: 1, step: 0.1 }}
          sx={{ minWidth: 80 }}
        >
          {restrictions.allowed.map((val) => (
            <MenuItem key={val} value={val}>
              {val}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body1">{paramLabel}:</Typography>
      <TextField
        type="number"
        size="small"
        value={paramValues[paramKey] ?? defaultValue ?? ""}
        onChange={(e) => {
          if (parameter?.type === "integer") {
            const raw = e.target.value;
            const parsed = raw === "" ? "" : Math.trunc(Number(raw));
            setParamValues((prev) => ({
              ...prev,
              [paramKey]: Number.isFinite(parsed) ? parsed : "",
            }));
          } else {
            setParamValues((prev) => ({
              ...prev,
              [paramKey]: handleNumberInput(e.target.value),
            }));
          }
          if (defaultModelParams) setDefaultModelParams(false);
        }}
        inputProps={{
          min: restrictions?.min ?? undefined,
          max: restrictions?.max ?? undefined,
          step: parameter?.type === "integer" ? 1 : 0.1,
        }}
        sx={{ maxWidth: parameter?.type === "integer" ? 100 : 80 }}
      />
    </Stack>
  );
};

export default NumberParameterField;
