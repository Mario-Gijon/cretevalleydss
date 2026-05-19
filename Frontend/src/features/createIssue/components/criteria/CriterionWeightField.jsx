import { Stack, TextField, Typography } from "@mui/material";

import { buildDefaultFuzzyWeightVector } from "../../utils/criteriaWeighting.model";
import { formatDisplayNumber } from "../../utils/criteriaWeighting.helpers";

const weightInputSx = {
  width: 82,
  "& .MuiInputBase-input": {
    py: 0.75,
    fontWeight: 850,
  },
};

export const CriterionWeightField = ({
  mode,
  isSingleLeaf,
  fuzzyValueCount,
  manualValue,
  fuzzyVector,
  onManualChange,
  onFuzzyChange,
}) => {
  if (mode === "manual") {
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.8}
        sx={{ flexShrink: 0, minWidth: { xs: "auto", sm: 150 } }}
      >
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 900, whiteSpace: "nowrap" }}
        >
          Weight
        </Typography>

        <TextField
          type="number"
          color="info"
          size="small"
          value={isSingleLeaf ? 1 : (manualValue ?? "")}
          disabled={isSingleLeaf}
          onChange={(event) => {
            if (isSingleLeaf) return;
            const value = event.target.value;
            const parsed = value === "" ? "" : Number(value);

            onManualChange?.(
              parsed === "" || Number.isNaN(parsed)
                ? ""
                : Number(Math.max(0, Math.min(1, parsed)).toFixed(3))
            );
          }}
          inputProps={{ min: 0, max: 1, step: 0.001 }}
          sx={weightInputSx}
        />
      </Stack>
    );
  }

  if (mode === "fuzzy") {
    if (!Number.isInteger(fuzzyValueCount) || fuzzyValueCount < 2) {
      return (
        <Typography variant="caption" color="warning.main" sx={{ fontWeight: 850 }}>
          Missing fuzzy value count
        </Typography>
      );
    }

    const fallbackVector = isSingleLeaf
      ? Array.from({ length: fuzzyValueCount }, () => 1)
      : buildDefaultFuzzyWeightVector(fuzzyValueCount);

    const vector = Array.isArray(fuzzyVector) ? fuzzyVector : fallbackVector;

    return (
      <Stack
        direction="row"
        alignItems="center"
        gap={0.8}
        flexWrap="wrap"
        sx={{ minWidth: 0 }}
      >
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 900, whiteSpace: "nowrap" }}
        >
          Fuzzy weight
        </Typography>

        {Array.from({ length: fuzzyValueCount }).map((_, index) => (
          <TextField
            key={index}
            type="number"
            color="info"
            size="small"
            value={vector?.[index] === "" ? "" : formatDisplayNumber(vector?.[index])}
            disabled={isSingleLeaf}
            onChange={(event) => {
              if (isSingleLeaf) return;

              const value = event.target.value;
              const parsed = value === "" ? "" : Number(value);
              const nextVector = Array.from({ length: fuzzyValueCount }, (_, vectorIndex) => {
                const sourceValue = vector?.[vectorIndex];
                return Number.isFinite(Number(sourceValue))
                  ? Number(sourceValue)
                  : fallbackVector[vectorIndex];
              });

              nextVector[index] =
                parsed === "" || Number.isNaN(parsed)
                  ? ""
                  : Math.max(0, Math.min(1, parsed));

              onFuzzyChange?.(nextVector);
            }}
            inputProps={{ min: 0, max: 1, step: 0.01 }}
            sx={weightInputSx}
          />
        ))}
      </Stack>
    );
  }

  return null;
};

export default CriterionWeightField;