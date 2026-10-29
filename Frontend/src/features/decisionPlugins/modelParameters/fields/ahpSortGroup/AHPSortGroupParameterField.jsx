import { MenuItem, Stack, TextField, Typography } from "@mui/material";

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export const AHPSortGroupParameterField = ({
  value,
  onChange,
  error = "",
  disabled = false,
  showValidation = false,
  parameterContext,
}) => {
  const selectedExpertCount = Number.isInteger(parameterContext?.selectedExpertCount)
    ? parameterContext.selectedExpertCount
    : 0;
  const tiePolicy = isPlainObject(value) ? value.tiePolicy ?? "" : "";
  const visibleError = showValidation ? error : "";

  return (
    <Stack spacing={0.7} sx={{ minWidth: 0 }}>
      <TextField
        select
        size="small"
        color="secondary"
        label="Equal-vote preference"
        value={tiePolicy}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next ? { tiePolicy: next } : undefined);
        }}
        disabled={disabled}
        error={Boolean(visibleError)}
        helperText={visibleError || (
          selectedExpertCount >= 2
            ? "Required with multiple experts. It applies only when categories receive the same maximum number of votes."
            : "Optional for individual classification; used only to break a group vote tie."
        )}
        sx={{ maxWidth: { xs: "100%", sm: 430 } }}
      >
        <MenuItem value="">Not set</MenuItem>
        <MenuItem value="optimistic">More preferred category</MenuItem>
        <MenuItem value="pessimistic">Less preferred category</MenuItem>
      </TextField>
      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 760, lineHeight: 1.45 }}>
        Each expert classifies alternatives independently. The category with the most votes wins, even without an absolute majority. This is unweighted voting, not consensus or combined Saaty judgments.
      </Typography>
    </Stack>
  );
};

export default AHPSortGroupParameterField;
