import { useEffect, useMemo } from "react";
import { Box, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { buildSelectCriterionDraft, buildSelectCriterionRows, resolveSelectCriterionRowValue, selectCriterionMapsEqual } from "./operations/selectCriterionValues";
import { isPlainObject } from "../../../../../utils/common/objects";
import { selectCriterionParameterFieldSx } from "./styles/SelectCriterionParameterField.styles";

const getAllowedValues = (parameter) =>
  Array.isArray(parameter?.restrictions?.allowed) && parameter.restrictions.allowed.length > 0
    ? parameter.restrictions.allowed
    : [];

export const SelectCriterionParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
  parameterContext,
}) => {
  const leafCriteria = parameterContext?.leafCriteria;
  const rows = useMemo(
    () => buildSelectCriterionRows({ leafCriteria }),
    [leafCriteria]
  );
  const allowed = getAllowedValues(parameter);
  const label = parameter?.label || "Selection";

  useEffect(() => {
    if (rows.length === 0) return;
    if (!isPlainObject(value)) return;
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
      <Typography variant="body2" sx={selectCriterionParameterFieldSx.title}>
        {label}
      </Typography>

      <Box sx={selectCriterionParameterFieldSx.grid(rows.length)}>
        {rows.map((row) => (
          <Typography key={`label-${row.key}`} variant="caption" sx={selectCriterionParameterFieldSx.label}>
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
            sx={selectCriterionParameterFieldSx.input}
            disabled={disabled || allowed.length === 0}
            error={Boolean(error)}
            inputProps={{ "aria-label": `${label} for ${row.name}` }}
          >
            {allowed.map((option) => (
              <MenuItem key={`${typeof option}:${String(option)}`} value={option}>
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
