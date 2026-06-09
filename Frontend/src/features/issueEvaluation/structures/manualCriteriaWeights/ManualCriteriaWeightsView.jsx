import { Stack, TextField, Typography } from "@mui/material";

const resolveCriterionName = (criterionEntry) => {
  if (typeof criterionEntry === "string") {
    return criterionEntry;
  }

  if (criterionEntry && typeof criterionEntry === "object") {
    return String(criterionEntry.name || criterionEntry.criterionName || "").trim();
  }

  return "";
};

const ManualCriteriaWeightsView = ({
  evaluationContext,
  criteria: directCriteria,
  payload: directPayload,
  setPayload: directSetPayload,
  disabled = false,
}) => {
  const context = evaluationContext || {};
  const criteriaSource = directCriteria ?? context.criteria ?? [];
  const criterionNames = Array.isArray(criteriaSource)
    ? criteriaSource.map(resolveCriterionName).filter(Boolean)
    : [];
  const payload = directPayload ?? context.payload ?? {};
  const setPayload = directSetPayload ?? context.setPayload;
  const permitEdit = context.permitEdit !== false && !disabled;
  const isReadOnly = !permitEdit || typeof setPayload !== "function";
  const weightsByCriterion =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload.weightsByCriterion || {}
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
            setPayload((previous) => ({
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
