import { useEffect } from "react";
import { Stack, Typography, TextField, ButtonGroup, Button, MenuItem } from "@mui/material";
import { handleNumberInput } from "../../../utils/handleTwoDecimals";
import { resolveLeafLengthForParameter } from "../modelParameter.metadata";
import { validateCriteriaWeightsParameterValue } from "../modelParameter.validation";

const ensureLength = (arr, len, filler = "") => {
  const normalized = Array.isArray(arr) ? [...arr] : [];
  if (normalized.length < len) return [...normalized, ...Array(len - normalized.length).fill(filler)];
  if (normalized.length > len) return normalized.slice(0, len);
  return normalized;
};

const renderBwmSelection = ({ leafCriteria, bwmData, setBwmData }) => {
  const criteria = leafCriteria;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="body2">Best (most important):</Typography>
        <TextField
          select
          size="small"
          color="info"
          value={bwmData.best}
          onChange={(e) =>
            setBwmData((prev) => ({ ...prev, best: e.target.value }))
          }
        >
          {criteria.map((c, i) => (
            <MenuItem key={i} value={c.name}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="body2">Worst (least important):</Typography>
        <TextField
          select
          size="small"
          color="info"
          value={bwmData.worst}
          onChange={(e) =>
            setBwmData((prev) => ({ ...prev, worst: e.target.value }))
          }
        >
          {criteria.map((c, i) => (
            <MenuItem key={i} value={c.name}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {bwmData.best && (
        <Stack spacing={1}>
          <Typography variant="body2">
            Compare the <b>Best ({bwmData.best})</b> with others (1–9)
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={2}>
            {criteria
              .filter((c) => c.name !== bwmData.best)
              .map((c) => (
                <Stack key={c.name} spacing={0.5} alignItems="center">
                  <Typography variant="caption">{`B/${c.name}`}</Typography>
                  <TextField
                    color="info"
                    type="number"
                    size="small"
                    value={bwmData.bestToOthers[c.name] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setBwmData((prev) => ({
                        ...prev,
                        bestToOthers: { ...prev.bestToOthers, [c.name]: val },
                      }));
                    }}
                    inputProps={{ min: 1, max: 9 }}
                    sx={{ width: 60 }}
                  />
                </Stack>
              ))}
          </Stack>
        </Stack>
      )}

      {bwmData.worst && (
        <Stack spacing={1}>
          <Typography variant="body2">
            Compare others with the <b>Worst ({bwmData.worst})</b> (1–9)
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={2}>
            {criteria
              .filter((c) => c.name !== bwmData.worst)
              .map((c) => (
                <Stack key={c.name} spacing={0.5} alignItems="center">
                  <Typography variant="caption">{`${c.name}/W`}</Typography>
                  <TextField
                    type="number"
                    size="small"
                    color="info"
                    value={bwmData.othersToWorst[c.name] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setBwmData((prev) => ({
                        ...prev,
                        othersToWorst: { ...prev.othersToWorst, [c.name]: val },
                      }));
                    }}
                    inputProps={{ min: 1, max: 9 }}
                    sx={{ width: 60 }}
                  />
                </Stack>
              ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
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
  weightingMode,
  setWeightingMode,
  bwmData,
  setBwmData,
  showValidationErrors = false,
}) => {
  const restrictions = parameter?.restrictions || {};
  const defaultValue = parameter?.default;
  const length =
    resolveLeafLengthForParameter(parameter, leafCriteria.length) ??
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

        {leafCriteria.length >= 2 && (
          <ButtonGroup color="secondary" size="small">
            <Button
              key="manual"
              variant={weightingMode === "manual" ? "contained" : "outlined"}
              onClick={() => setWeightingMode?.("manual")}
            >
              Manual
            </Button>
            <Button
              key="consensus"
              variant={weightingMode === "consensus" ? "contained" : "outlined"}
              onClick={() => setWeightingMode?.("consensus")}
            >
              Consensus
            </Button>
            <Button
              key="bwm"
              variant={weightingMode === "bwm" ? "contained" : "outlined"}
              onClick={() => setWeightingMode?.("bwm")}
            >
              BWM
            </Button>
            <Button
              key="consensusBwm"
              variant={weightingMode === "consensusBwm" ? "contained" : "outlined"}
              onClick={() => setWeightingMode?.("consensusBwm")}
            >
              Consensus BWM
            </Button>
            <Button
              key="simulatedConsensusBwm"
              variant={weightingMode === "simulatedConsensusBwm" ? "contained" : "outlined"}
              onClick={() => setWeightingMode?.("simulatedConsensusBwm")}
            >
              Simulated consensus BWM
            </Button>
          </ButtonGroup>
        )}
      </Stack>

      {leafCriteria.length === 1 ? (
        <Stack spacing={1} alignItems="flex-start">
          <Typography variant="body2">
            Since there is only one criterion, its weight is fixed to <b>1</b>.
          </Typography>
        </Stack>
      ) : weightingMode === "manual" ? (
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
      ) : weightingMode === "bwm" ? (
        renderBwmSelection({ leafCriteria, bwmData, setBwmData })
      ) : weightingMode === "consensusBwm" ? (
        <Typography variant="body2" fontStyle="italic" color="text.secondary">
          The weight selection process will not be configured now.
          Experts will participate in one or more consensus rounds to determine the final weights.
        </Typography>
      ) : weightingMode === "simulatedConsensusBwm" ? (
        <Typography variant="body2" fontStyle="italic" color="text.secondary">
          All experts will provide their preferences for the criteria using the BWM method. The system will then simulate consensus rounds, aggregating these preferences step by step until stable final weights are reached.
        </Typography>
      ) : weightingMode === "consensus" ? (
        <Typography variant="body2" fontStyle="italic" color="text.secondary">
          All experts will assign weights to the criteria. Simulated consensus rounds will be performed until final weights is reached.
        </Typography>
      ) : null}

      {leafCriteria.length >= 2 &&
        weightingMode === "manual" &&
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
