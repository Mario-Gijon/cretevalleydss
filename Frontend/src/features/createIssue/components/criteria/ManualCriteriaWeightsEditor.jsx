import { Stack, TextField, Typography } from "@mui/material";

const EPSILON = 0.001;

export const ManualCriteriaWeightsEditor = ({
  criterionNames,
  weightsByCriterion,
  onWeightChange,
  isSingleCriterion,
}) => {
  const safeNames = Array.isArray(criterionNames) ? criterionNames : [];
  const values = safeNames.map((criterionName) => weightsByCriterion?.[criterionName]);
  const parsedValues = values.map((value) => Number(value));
  const allNumeric = parsedValues.every((value) => Number.isFinite(value));
  const total = allNumeric
    ? parsedValues.reduce((sum, value) => sum + value, 0)
    : null;
  const isValidSum = Number.isFinite(total) ? Math.abs(total - 1) <= EPSILON : false;

  return (
    <Stack spacing={1}>
      <Stack direction="row" flexWrap="wrap" gap={2}>
        {safeNames.map((criterionName) => {
          const currentValue = isSingleCriterion
            ? 1
            : (weightsByCriterion?.[criterionName] ?? "");

          return (
            <Stack key={criterionName} spacing={0.5} alignItems="center">
              <Typography variant="caption">{criterionName}</Typography>
              <TextField
                type="number"
                color="info"
                size="small"
                value={currentValue}
                disabled={isSingleCriterion}
                onChange={(event) => {
                  if (isSingleCriterion) return;
                  const value = event.target.value;
                  const parsed = value === "" ? "" : Number(value);
                  onWeightChange(
                    criterionName,
                    parsed === "" || Number.isNaN(parsed)
                      ? ""
                      : Math.max(0, Math.min(1, parsed))
                  );
                }}
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                sx={{ width: 90 }}
              />
            </Stack>
          );
        })}
      </Stack>

      {isSingleCriterion ? (
        <Typography variant="caption" color="text.secondary">
          Single leaf criterion uses weight 1.
        </Typography>
      ) : (
        <Typography
          variant="caption"
          color={isValidSum ? "text.secondary" : "error"}
          sx={{ fontWeight: 700 }}
        >
          {allNumeric
            ? `Weights sum: ${total.toFixed(4)}${isValidSum ? "" : " (must be 1)"}`
            : "All leaf weights must be numeric and sum to 1."}
        </Typography>
      )}
    </Stack>
  );
};

export default ManualCriteriaWeightsEditor;
