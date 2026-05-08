import { Stack, Typography, TextField } from "@mui/material";
const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

const handleFuzzyInput = (value, min = 0, max = 1) => {
  if (value === "") return "";
  if (value === "0." || value === ".") return value;
  let num = parseFloat(value);
  if (isNaN(num)) return "";
  if (num < min) num = min;
  if (num > max) num = max;
  return num;
};

export const FuzzyArrayParameterField = ({
  parameter,
  paramKey,
  paramLabel,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
  leafCriteria,
}) => {
  const restrictions = parameter?.restrictions || {};
  const length =
    getParameterExpectedLength(parameter, leafCriteria.length) ??
    restrictions?.length ?? 1;

  const currentValues =
    Array.isArray(paramValues[paramKey]) && paramValues[paramKey].length === length
      ? paramValues[paramKey]
      : Array.from({ length }, () => ["", "", ""]);

  return (
    <Stack spacing={1}>
      <Typography variant="body1">{paramLabel}:</Typography>
      <Stack direction="row" flexWrap="wrap" gap={2}>
        {currentValues.map((triple, index) => (
          <Stack key={index} spacing={0.5} alignItems="center">
            <Typography variant="caption">
              {leafCriteria[index]?.name ?? `C${index + 1}`}
            </Typography>
            <Stack direction="row" spacing={1}>
              {["l", "m", "u"].map((label, tripleIndex) => (
                <TextField
                  key={tripleIndex}
                  type="number"
                  size="small"
                  label={label}
                  value={triple[tripleIndex]}
                  onChange={(e) => {
                    const newTriples = currentValues.map((triangle) => [...triangle]);
                    newTriples[index][tripleIndex] = handleFuzzyInput(
                      e.target.value,
                      restrictions?.min ?? 0,
                      restrictions?.max ?? 1
                    );
                    setParamValues((prev) => ({
                      ...prev,
                      [paramKey]: newTriples,
                    }));
                    if (defaultModelParams) setDefaultModelParams(false);
                  }}
                  inputProps={{
                    min: restrictions?.min ?? 0,
                    max: restrictions?.max ?? 1,
                    step: 0.1,
                  }}
                  sx={{ width: 80 }}
                />
              ))}
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

export default FuzzyArrayParameterField;
