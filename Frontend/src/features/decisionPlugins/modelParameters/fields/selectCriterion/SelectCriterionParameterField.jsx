import { useEffect } from "react";
import { Box, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { buildSelectCriterionDraft, buildSelectCriterionRows, resolveSelectCriterionRowValue, selectCriterionMapsEqual } from "./selectCriterionValues";

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

const requireAllowedValues = (parameter) => {
  const allowed = parameter.restrictions?.allowed;

  if (!Array.isArray(allowed)) {
    throw new Error(
      `[modelParameters] Missing allowed values for criterion parameter "${parameter.key}".`
    );
  }

  return allowed;
};

export const SelectCriterionParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
  parameterContext,
}) => {
  const rows = buildSelectCriterionRows(parameterContext);
  const allowed = requireAllowedValues(parameter);
  const { label } = parameter;

  useEffect(() => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return;
    const reconciled = buildSelectCriterionDraft({ rows, value });
    if (!selectCriterionMapsEqual(value, reconciled)) onChange(reconciled);
  }, [onChange, rows, value]);

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
            value={resolveSelectCriterionRowValue({ value, rowKey: row.key })}
            onChange={(event) => {
              onChange({
                ...buildSelectCriterionDraft({ rows, value }),
                [row.key]: event.target.value,
              });
            }}
            sx={textFieldSx}
            disabled={disabled}
            error={Boolean(error)}
          >
            {allowed.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
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
