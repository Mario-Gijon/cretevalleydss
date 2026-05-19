import { Alert, Stack, TextField, Typography } from "@mui/material";

import {
  buildDefaultFuzzyWeightVector,
} from "../../utils/criteriaWeighting.model";
import { formatDisplayNumber } from "./criteriaWeighting.helpers";

export const FuzzyCriteriaWeightsEditor = ({
  criterionNames,
  fuzzyValueCount,
  weightsByCriterion,
  onVectorChange,
  isSingleCriterion,
}) => {
  if (!Number.isInteger(fuzzyValueCount) || fuzzyValueCount < 2) {
    return (
      <Alert severity="warning">
        Fuzzy criteria weights require a consistent linguistic value count in assigned domains.
      </Alert>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        Enter fuzzy weights with non-decreasing values in [0, 1].
      </Typography>

      <Stack spacing={1.2}>
        {(criterionNames || []).map((criterionName) => {
          const fallbackVector = isSingleCriterion
            ? Array.from({ length: fuzzyValueCount }, () => 1)
            : buildDefaultFuzzyWeightVector(fuzzyValueCount);

          const currentVector = weightsByCriterion?.[criterionName];
          const vector = Array.isArray(currentVector)
            ? currentVector
            : fallbackVector;

          return (
            <Stack key={criterionName} spacing={0.5}>
              <Typography variant="caption">{criterionName}</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {Array.from({ length: fuzzyValueCount }).map((_, index) => (
                  <TextField
                    key={`${criterionName}-${index}`}
                    type="number"
                    color="info"
                    size="small"
                    value={vector?.[index] === "" ? "" : formatDisplayNumber(vector?.[index])}
                    disabled={isSingleCriterion}
                    onChange={(event) => {
                      if (isSingleCriterion) return;
                      const value = event.target.value;
                      const parsed = value === "" ? "" : Number(value);
                      const nextVector = Array.from(
                        { length: fuzzyValueCount },
                        (_, vectorIndex) => {
                          const sourceValue = vector?.[vectorIndex];
                          return Number.isFinite(Number(sourceValue))
                            ? Number(sourceValue)
                            : fallbackVector[vectorIndex];
                        }
                      );

                      nextVector[index] =
                        parsed === "" || Number.isNaN(parsed) ? "" : parsed;

                      onVectorChange(criterionName, nextVector);
                    }}
                    inputProps={{ min: 0, max: 1, step: 0.01 }}
                    sx={{ width: 90 }}
                  />
                ))}
              </Stack>
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default FuzzyCriteriaWeightsEditor;
