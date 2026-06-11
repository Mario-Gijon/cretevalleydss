import { Box, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { isPlainObject } from "../../logic/isPlainObject";
import {
  buildCriterionParameterRows,
  resolveCriterionRowValue,
} from "../../logic/modelParameterCriteria";

const FIELD_HEIGHT = 36;

const labelSx = {
  display: "block",
  color: "text.secondary",
  fontWeight: 700,
  whiteSpace: "normal",
  lineHeight: 1,
  textAlign: "center",
};

const titleSx = {
  color: "text.primary",
  fontWeight: 800,
  mb: 0.5,
};

const textFieldSx = {
  width: 128,
  "& .MuiOutlinedInput-root": {
    height: FIELD_HEIGHT,
  },
  "& .MuiSelect-select": {
    py: 0,
    display: "flex",
    alignItems: "center",
  },
};

const readAllowedValues = (parameter) =>
  Array.isArray(parameter.restrictions?.allowed) ? parameter.restrictions.allowed : [];

export const SelectCriterionParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
  context,
}) => {
  const rows = buildCriterionParameterRows({ context });
  const allowed = readAllowedValues(parameter);
  const label = parameter.label || parameter.key;

  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 750 }}>
        No criteria available for {label}.
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography variant="body2" sx={titleSx}>
        {label}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${rows.length}, max-content)`,
          columnGap: 1,
          rowGap: 0.75,
          alignItems: "start",
          width: "fit-content",
          maxWidth: "100%",
          overflowX: "auto",
        }}
      >
        {rows.map((row) => (
          <Typography key={`label-${row.key}`} variant="caption" sx={labelSx}>
            {row.name}
          </Typography>
        ))}

        {rows.map((row) => (
          <TextField
            key={`input-${row.key}`}
            select
            variant="outlined"
            color="secondary"
            size="small"
            value={resolveCriterionRowValue({
              value,
              defaultValue: parameter.default ?? "",
              rowKey: row.key,
            })}
            onChange={(event) => {
              const previous = isPlainObject(value) ? value : {};
              onChange({
                ...previous,
                [row.key]: event.target.value,
              });
            }}
            sx={textFieldSx}
            disabled={disabled}
            error={Boolean(error)}
          >
            {allowed.map((option) => (
              <MenuItem key={String(option)} value={option}>
                {String(option)}
              </MenuItem>
            ))}
          </TextField>
        ))}
      </Box>

      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default SelectCriterionParameterField;
