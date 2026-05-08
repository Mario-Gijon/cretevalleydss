import { Stack, Typography, TextField } from "@mui/material";

const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

const formatTwoDecimals = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed.toFixed(2);
};

const toEditableFuzzyInput = (value, min = 0, max = 1) => {
  if (value === "") return "";
  if (value === "0." || value === ".") return value;

  let num = parseFloat(value);
  if (Number.isNaN(num)) return "";
  if (num < min) num = min;
  if (num > max) num = max;
  return num;
};

const isTriangle = (triangle) =>
  Array.isArray(triangle) &&
  triangle.length === 3 &&
  triangle.every((item) => Number.isFinite(Number(item)));

const buildDisplayValues = ({ currentValues, defaultModelParams, isEqualDefault }) => {
  if (!defaultModelParams || !isEqualDefault) {
    return currentValues;
  }

  if (!Array.isArray(currentValues) || currentValues.length === 0) {
    return currentValues;
  }

  const firstTriangle = currentValues[0];
  if (!isTriangle(firstTriangle)) {
    return currentValues;
  }

  const roundedFirst = firstTriangle.map((item) => formatTwoDecimals(item));

  return currentValues.map((triangle) => {
    if (!isTriangle(triangle)) return triangle;
    return roundedFirst;
  });
};

export const FuzzyCriteriaWeightsParameterField = ({
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
    restrictions?.length ??
    1;

  const currentValues =
    Array.isArray(paramValues[paramKey]) && paramValues[paramKey].length === length
      ? paramValues[paramKey]
      : Array.from({ length }, () => ["", "", ""]);

  const displayValues = buildDisplayValues({
    currentValues,
    defaultModelParams,
    isEqualDefault: parameter?.default === "equal",
  });

  return (
    <Stack spacing={1}>
      <Typography variant="body1">{paramLabel}:</Typography>
      <Stack direction="row" flexWrap="wrap" gap={2}>
        {displayValues.map((triple, index) => (
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
                  value={triple?.[tripleIndex] ?? ""}
                  onChange={(e) => {
                    const newTriples = currentValues.map((triangle) =>
                      Array.isArray(triangle) ? [...triangle] : ["", "", ""]
                    );

                    const parsed = toEditableFuzzyInput(
                      e.target.value,
                      restrictions?.min ?? 0,
                      restrictions?.max ?? 1
                    );

                    if (!Array.isArray(newTriples[index])) {
                      newTriples[index] = ["", "", ""];
                    }

                    newTriples[index][tripleIndex] = parsed;

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

export default FuzzyCriteriaWeightsParameterField;
