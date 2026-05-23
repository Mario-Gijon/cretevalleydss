import { Stack, Typography, TextField, MenuItem } from "@mui/material";
import { handleNumberInput } from "../../../../utils/handleTwoDecimals";
import {
  resolveLeafCriteriaRows,
  validateCriterionMapParameterValue,
} from "./criterionMap.validation";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeRestrictions = (parameter) =>
  isPlainObject(parameter?.restrictions) ? parameter.restrictions : {};

const normalizeValueType = (restrictions) =>
  typeof restrictions?.valueType === "string" && restrictions.valueType.trim()
    ? restrictions.valueType.trim()
    : "number";

const buildEmptyValue = ({ valueType, restrictions }) => {
  if (valueType === "enum") {
    const allowed = Array.isArray(restrictions?.allowed) ? restrictions.allowed : [];
    return allowed.length > 0 ? allowed[0] : "";
  }

  return "";
};

const normalizeCurrentMap = ({
  value,
  parameter,
  leafCriteria,
}) => {
  const restrictions = normalizeRestrictions(parameter);
  const rows = resolveLeafCriteriaRows(leafCriteria);
  const requiredForEachCriterion = restrictions.requiredForEachCriterion === true;

  const current = isPlainObject(value) ? { ...value } : {};

  if (!requiredForEachCriterion) {
    return current;
  }

  const valueType = normalizeValueType(restrictions);
  const emptyValue = buildEmptyValue({ valueType, restrictions });

  for (const row of rows) {
    if (!Object.prototype.hasOwnProperty.call(current, row.key)) {
      current[row.key] = emptyValue;
    }
  }

  return current;
};

export const CriterionMapParameterField = ({
  parameter,
  paramKey,
  paramLabel,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
  leafCriteria,
  showValidationErrors = false,
}) => {
  const restrictions = normalizeRestrictions(parameter);
  const rows = resolveLeafCriteriaRows(leafCriteria);
  const valueType = normalizeValueType(restrictions);
  const currentValue = normalizeCurrentMap({
    value: paramValues?.[paramKey] ?? parameter?.default,
    parameter,
    leafCriteria,
  });

  const validation = validateCriterionMapParameterValue({
    parameter,
    value: currentValue,
    leafCriteria,
  });

  const updateValue = (criterionKey, nextRawValue) => {
    setParamValues((previous) => {
      const currentMap = isPlainObject(previous?.[paramKey]) ? previous[paramKey] : {};
      return {
        ...previous,
        [paramKey]: {
          ...currentMap,
          [criterionKey]: nextRawValue,
        },
      };
    });

    if (defaultModelParams) {
      setDefaultModelParams(false);
    }
  };

  if (rows.length === 0) {
    return (
      <Stack spacing={0.5}>
        <Typography variant="body1">{paramLabel}:</Typography>
        <Typography variant="caption" color="error">
          This parameter requires leaf criteria.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1} alignItems="flex-start">
      <Typography variant="body1">{paramLabel}:</Typography>

      <Stack direction="row" flexWrap="wrap" gap={2}>
        {rows.map((row) => (
          <Stack key={row.key} spacing={0.5} alignItems="flex-start">
            <Typography variant="caption">{row.name}</Typography>

            {valueType === "enum" ? (
              <TextField
                select
                size="small"
                color="info"
                value={currentValue[row.key] ?? ""}
                onChange={(event) => updateValue(row.key, event.target.value)}
                sx={{ minWidth: 160 }}
              >
                {(Array.isArray(restrictions.allowed) ? restrictions.allowed : []).map((option) => (
                  <MenuItem key={`${row.key}-${String(option)}`} value={option}>
                    {String(option)}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                type="number"
                size="small"
                color="info"
                value={currentValue[row.key] ?? ""}
                onChange={(event) => {
                  const normalized = handleNumberInput(event.target.value);
                  updateValue(row.key, normalized);
                }}
                inputProps={{
                  min: typeof restrictions.min === "number" ? restrictions.min : undefined,
                  max: typeof restrictions.max === "number" ? restrictions.max : undefined,
                  step: 0.1,
                }}
                sx={{ width: 120 }}
              />
            )}
          </Stack>
        ))}
      </Stack>

      {showValidationErrors && !validation.isValid ? (
        <Typography variant="caption" color="error">
          {validation.message}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default CriterionMapParameterField;
