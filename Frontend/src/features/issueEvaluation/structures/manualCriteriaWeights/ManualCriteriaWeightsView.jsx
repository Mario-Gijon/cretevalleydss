import { Stack, TextField, Typography } from "@mui/material";

const ManualCriteriaWeightsView = ({
  evaluationContext,
  evaluationPayload,
  setEvaluationPayload,
  readOnly,
  loading,
}) => {
  const criterionNames = Array.isArray(evaluationContext?.criteria?.leafNames)
    ? evaluationContext.criteria.leafNames
    : [];
  const isReadOnly = readOnly === true || loading === true;
  const weightsByCriterion =
    evaluationPayload &&
    typeof evaluationPayload === "object" &&
    !Array.isArray(evaluationPayload)
      ? evaluationPayload.weightsByCriterion || {}
      : {};

  if (criterionNames.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No criteria available.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.1} sx={{ pt: 1 }}>
      {criterionNames.map((criterionName) => (
        <TextField
          key={criterionName}
          label={criterionName}
          type="number"
          size="small"
          color="info"
          disabled={isReadOnly}
          value={weightsByCriterion[criterionName] ?? ""}
          onChange={(event) => {
            if (isReadOnly) {
              return;
            }

            const raw = event.target.value;
            setEvaluationPayload((previous) => ({
              ...(previous && typeof previous === "object" ? previous : {}),
              weightsByCriterion: {
                ...((previous && previous.weightsByCriterion) || {}),
                [criterionName]: raw === "" ? "" : Number(raw),
              },
            }));
          }}
          inputProps={{ min: 0, max: 1, step: 0.01 }}
        />
      ))}
    </Stack>
  );
};

export default ManualCriteriaWeightsView;
