import { useEffect, useMemo } from "react";
import { Box, Stack, TextField, Typography } from "@mui/material";
import {
  buildNumberCriterionDraft,
  buildNumberCriterionRows,
  resolveNumberCriterionRowValue,
  reconcileNumberCriterionMap,
  numberCriterionMapsEqual,
} from "./operations/numberCriterionValues";
import { isPlainObject } from "../../../../../utils/common/objects";
import { numberCriterionParameterFieldSx } from "./styles/NumberCriterionParameterField.styles";

export const NumberCriterionParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
  parameterContext,
}) => {
  const leafCriteria = parameterContext?.leafCriteria;
  const rows = useMemo(
    () => buildNumberCriterionRows({ leafCriteria }),
    [leafCriteria]
  );
  const label = parameter?.label || "Parameter";
  const restrictions = parameter?.restrictions || {};
  const min = Number.isFinite(restrictions.min) ? restrictions.min : undefined;
  const max = Number.isFinite(restrictions.max) ? restrictions.max : undefined;

  useEffect(() => {
    if (rows.length === 0) return;
    if (!isPlainObject(value)) return;
    const reconciled = reconcileNumberCriterionMap({ rows, value });
    if (!numberCriterionMapsEqual(value, reconciled)) onChange(reconciled);
  }, [onChange, rows, value]);

  if (rows.length === 0) {
    return <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 750 }}>No criteria available for {label}.</Typography>;
  }

  return (
    <Stack spacing={1}>
      <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 800, mb: 0.5 }}>{label}</Typography>
      <Box sx={numberCriterionParameterFieldSx.grid(rows.length)}>
        {rows.map((row) => <Typography key={`label-${row.key}`} variant="caption" sx={numberCriterionParameterFieldSx.label}>{row.name}</Typography>)}
        {rows.map((row) => (
          <TextField
            key={`input-${row.key}`}
            type="number"
            variant="outlined"
            color="secondary"
            size="small"
            value={resolveNumberCriterionRowValue({ value, rowKey: row.key })}
            onChange={(event) => onChange({
              ...buildNumberCriterionDraft({ rows, value }),
              [row.key]: event.target.value,
            })}
            inputProps={{ "aria-label": `${label} for ${row.name}`, min, max, step: "any" }}
            sx={numberCriterionParameterFieldSx.input}
            disabled={disabled}
            error={Boolean(error)}
          />
        ))}
      </Box>
      {error ? <Typography variant="caption" color="error">{error}</Typography> : null}
    </Stack>
  );
};

export default NumberCriterionParameterField;
