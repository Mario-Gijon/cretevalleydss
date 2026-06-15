import { Stack, Typography, TextField } from "@mui/material";
import { handleNumberInput } from "../../../../../utils/handleTwoDecimals";

const FIELD_HEIGHT = 36;

const labelSx = {
  height: FIELD_HEIGHT,
  display: "flex",
  alignItems: "center",
  fontWeight: 750,
  whiteSpace: "nowrap",
  lineHeight: 1,
};

const textFieldSx = {
  width: 88,
  "& .MuiOutlinedInput-root": {
    height: FIELD_HEIGHT,
  },
  "& input": {
    py: 0,
  },
};

export const NumberGlobalParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
}) => {
  const { restrictions = {}, label, type, valueType } = parameter;
  const isInteger = type === "integer" || valueType === "integer";

  return (
    <Stack spacing={0.35}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" sx={labelSx}>
          {label}:
        </Typography>

        <TextField
          type="number"
          variant="outlined"
          color="secondary"
          size="small"
          value={value ?? ""}
          onChange={(event) => {
            const raw = event.target.value;

            if (isInteger) {
              const parsed = raw === "" ? "" : Math.trunc(Number(raw));
              onChange(Number.isFinite(parsed) ? parsed : "");
              return;
            }

            onChange(handleNumberInput(raw));
          }}
          inputProps={{
            min: restrictions.min ?? undefined,
            max: restrictions.max ?? undefined,
            step: isInteger ? 1 : 0.1,
          }}
          sx={{
            ...textFieldSx,
            width: isInteger ? 96 : 88,
          }}
          disabled={disabled}
          error={Boolean(error)}
        />
      </Stack>

      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default NumberGlobalParameterField;
