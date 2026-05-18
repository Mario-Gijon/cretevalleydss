import { useEffect } from "react";
import { Stack, Typography, TextField, ButtonGroup, Button } from "@mui/material";
import { handleNumberInput } from "../../../../utils/handleTwoDecimals";
import { validateCriteriaWeightsParameterValue } from "./criteriaWeights.validation";

const MANUAL_CRITERIA_WEIGHTS = "manualCriteriaWeights";
const BEST_WORST_CRITERIA = "bestWorstCriteria";

const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

const ensureLength = (arr, len, filler = "") => {
  const normalized = Array.isArray(arr) ? [...arr] : [];
  if (normalized.length < len) return [...normalized, ...Array(len - normalized.length).fill(filler)];
  if (normalized.length > len) return normalized.slice(0, len);
  return normalized;
};

export const CriteriaWeightsParameterField = ({
  parameter,
  paramKey,
  paramLabel,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
  leafCriteria,
  criteriaWeightingStructureKey,
  setCriteriaWeightingStructureKey,
  showValidationErrors = false,
}) => {
  const restrictions = parameter?.restrictions || {};
  const defaultValue = parameter?.default;
  const canChooseWeightingStructure =
    typeof setCriteriaWeightingStructureKey === "function";
  const length =
    getParameterExpectedLength(parameter, leafCriteria.length) ??
    restrictions?.length ?? 2;

  const currentValues = ensureLength(
    paramValues[paramKey] ?? defaultValue ?? [],
    length,
    ""
  );
  const weightsValidation = validateCriteriaWeightsParameterValue({
    parameter,
    value: currentValues,
    leafCount: leafCriteria.length,
  });

  useEffect(() => {
    if (leafCriteria.length !== 1) return;
    const isSingleWeightOne =
      Array.isArray(paramValues[paramKey]) &&
      paramValues[paramKey].length === 1 &&
      Number(paramValues[paramKey][0]) === 1;

    if (!isSingleWeightOne) {
      setParamValues((prev) => ({ ...prev, [paramKey]: [1] }));
    }
  }, [leafCriteria.length, paramKey, paramValues, setParamValues]);

  return (
    <Stack spacing={1} alignItems="flex-start">
      <Stack pb={1} direction="row" spacing={2} alignItems="center">
        <Typography variant="body1">{paramLabel}:</Typography>

        {leafCriteria.length >= 2 && canChooseWeightingStructure && (
          <ButtonGroup color="secondary" size="small">
            <Button
              key={MANUAL_CRITERIA_WEIGHTS}
              variant={
                criteriaWeightingStructureKey === MANUAL_CRITERIA_WEIGHTS
                  ? "contained"
                  : "outlined"
              }
              onClick={() =>
                setCriteriaWeightingStructureKey?.(MANUAL_CRITERIA_WEIGHTS)
              }
            >
              Manual criteria weights
            </Button>
            <Button
              key={BEST_WORST_CRITERIA}
              variant={
                criteriaWeightingStructureKey === BEST_WORST_CRITERIA
                  ? "contained"
                  : "outlined"
              }
              onClick={() =>
                setCriteriaWeightingStructureKey?.(BEST_WORST_CRITERIA)
              }
            >
              Best-Worst criteria
            </Button>
          </ButtonGroup>
        )}
      </Stack>

      {leafCriteria.length === 1 ? (
        <Stack spacing={1} alignItems="flex-start">
          <Typography variant="body2">
            Since there is only one criterion, its weight is fixed to <b>1</b>.
          </Typography>
          <Stack spacing={0.5} alignItems="center">
            <Typography variant="caption">
              {leafCriteria[0]?.name ?? "Criterion"}
            </Typography>
            <TextField
              type="number"
              color="info"
              size="small"
              value={1}
              disabled
              inputProps={{ min: 1, max: 1, step: 1, readOnly: true }}
              sx={{ width: 80 }}
            />
          </Stack>
        </Stack>
      ) : criteriaWeightingStructureKey === MANUAL_CRITERIA_WEIGHTS ? (
        <Stack direction="row" flexWrap="wrap" gap={2}>
          {leafCriteria.map((crit, i) => (
            <Stack key={i} spacing={0.5} alignItems="center">
              <Typography variant="caption">{crit?.name ?? `C${i + 1}`}</Typography>
              <TextField
                type="number"
                color="info"
                size="small"
                value={currentValues[i] ?? ""}
                onChange={(e) => {
                  const newValues = [...currentValues];
                  const parsed = Number(handleNumberInput(e.target.value));
                  if (!Number.isFinite(parsed)) {
                    newValues[i] = "";
                  } else {
                    newValues[i] = Math.min(1, Math.max(0, parsed));
                  }
                  setParamValues((prev) => ({ ...prev, [paramKey]: newValues }));
                  if (defaultModelParams) setDefaultModelParams(false);
                }}
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                sx={{ width: 80 }}
              />
            </Stack>
          ))}
        </Stack>
      ) : canChooseWeightingStructure &&
        criteriaWeightingStructureKey === BEST_WORST_CRITERIA ? (
        <Typography variant="body2" fontStyle="italic" color="text.secondary">
          Best-Worst preferences will be collected from experts during the criteria
          weighting evaluation stage.
        </Typography>
      ) : null}

      {leafCriteria.length >= 2 &&
        criteriaWeightingStructureKey === MANUAL_CRITERIA_WEIGHTS &&
        showValidationErrors &&
        !weightsValidation.isValid && (
        <Typography variant="caption" color="error">
          {weightsValidation.message}
        </Typography>
        )}
    </Stack>
  );
};

export default CriteriaWeightsParameterField;
