import { Stack, Typography, TextField } from "@mui/material";
import { handleNumberInput } from "../../../../../utils/handleTwoDecimals";

const FIELD_HEIGHT = 36;

const ensureLength = (value) => {
  const normalized = Array.isArray(value) ? [...value] : [];

  if (normalized.length < 2) {
    return [...normalized, ...Array(2 - normalized.length).fill("")];
  }

  return normalized.slice(0, 2);
};

const labelSx = {
  height: FIELD_HEIGHT,
  display: "flex",
  alignItems: "center",
  color: "text.secondary",
  fontWeight: 750,
  whiteSpace: "nowrap",
  lineHeight: 1,
};

const bracketSx = {
  height: FIELD_HEIGHT,
  display: "flex",
  alignItems: "center",
  color: "text.secondary",
  fontWeight: 750,
  lineHeight: 1,
};

const textFieldSx = {
  width: 72,
  "& .MuiOutlinedInput-root": {
    height: FIELD_HEIGHT,
  },
  "& input": {
    py: 0,
  },
};

export const IntervalGlobalParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
}) => {
  const { restrictions = {}, label } = parameter;
  const currentValues = ensureLength(value);

  return (
    <Stack spacing={0.35}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" sx={labelSx}>
          {label}:
        </Typography>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="body2" sx={bracketSx}>
            [
          </Typography>

          {currentValues.map((item, index) => (
            <TextField
              key={index}
              type="number"
              variant="outlined"
              color="secondary"
              size="small"
              value={item}
              onChange={(event) => {
                const next = [...currentValues];
                next[index] = handleNumberInput(event.target.value);
                onChange(next);
              }}
              inputProps={{
                min: restrictions.min ?? undefined,
                max: restrictions.max ?? undefined,
                step: 0.1,
              }}
              sx={textFieldSx}
              disabled={disabled}
              error={Boolean(error)}
            />
          ))}

          <Typography variant="body2" sx={bracketSx}>
            ]
          </Typography>
        </Stack>
      </Stack>

      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default IntervalGlobalParameterField;
