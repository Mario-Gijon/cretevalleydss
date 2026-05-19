import { useEffect } from "react";
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

const isFuzzyVector = (triangle, vectorLength) =>
  Array.isArray(triangle) &&
  triangle.length === vectorLength &&
  triangle.every((item) => Number.isFinite(Number(item)));

const buildDisplayValues = ({
  currentValues,
  defaultModelParams,
  isEqualDefault,
  vectorLength,
}) => {
  if (!defaultModelParams || !isEqualDefault) {
    return currentValues;
  }

  if (!Array.isArray(currentValues) || currentValues.length === 0) {
    return currentValues;
  }

  const firstTriangle = currentValues[0];
  if (!isFuzzyVector(firstTriangle, vectorLength)) {
    return currentValues;
  }

  const roundedFirst = firstTriangle.map((item) => formatTwoDecimals(item));

  return currentValues.map((triangle) => {
    if (!isFuzzyVector(triangle, vectorLength)) return triangle;
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
  const criteriaLength =
    getParameterExpectedLength(parameter, leafCriteria.length) ??
    leafCriteria.length ??
    1;
  const vectorLength =
    Number.isInteger(Number(restrictions?.length)) && Number(restrictions.length) >= 2
      ? Number(restrictions.length)
      : 3;

  const currentValues =
    Array.isArray(paramValues[paramKey]) && paramValues[paramKey].length === criteriaLength
      ? paramValues[paramKey]
      : Array.from({ length: criteriaLength }, () =>
          Array.from({ length: vectorLength }, () => "")
        );

  useEffect(() => {
    if (leafCriteria.length !== 1) return;
    if (!Number.isInteger(vectorLength) || vectorLength < 2) return;

    const currentSingle = Array.isArray(paramValues[paramKey])
      ? paramValues[paramKey][0]
      : null;
    const expected = Array.from({ length: vectorLength }, () => 1);
    const matchesExpected =
      Array.isArray(currentSingle) &&
      currentSingle.length === vectorLength &&
      currentSingle.every((value, index) => Number(value) === expected[index]);

    if (!matchesExpected) {
      setParamValues((previous) => ({
        ...previous,
        [paramKey]: [expected],
      }));
    }
  }, [leafCriteria.length, paramKey, paramValues, setParamValues, vectorLength]);

  const displayValues = buildDisplayValues({
    currentValues,
    defaultModelParams,
    isEqualDefault: parameter?.default === "equal",
    vectorLength,
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
              {Array.from({ length: vectorLength }).map((_, tripleIndex) => (
                <TextField
                  key={tripleIndex}
                  type="number"
                  size="small"
                  label={vectorLength === 3 ? ["l", "m", "u"][tripleIndex] : `${tripleIndex + 1}`}
                  value={triple?.[tripleIndex] ?? ""}
                  disabled={leafCriteria.length === 1}
                  onChange={(e) => {
                    if (leafCriteria.length === 1) return;
                    const newTriples = currentValues.map((triangle) =>
                      Array.isArray(triangle)
                        ? [...triangle]
                        : Array.from({ length: vectorLength }, () => "")
                    );

                    const parsed = toEditableFuzzyInput(
                      e.target.value,
                      restrictions?.min ?? 0,
                      restrictions?.max ?? 1
                    );

                    if (!Array.isArray(newTriples[index])) {
                      newTriples[index] = Array.from(
                        { length: vectorLength },
                        () => ""
                      );
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
