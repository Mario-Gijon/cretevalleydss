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

const ManualCriteriaWeightsView = ({ evaluationViewContext }) => {
  const {
    criteria,
    payload,
    ui,
  } = evaluationViewContext || {};
  const criterionNames = Array.isArray(criteria?.leafItems)
    ? criteria.leafItems.map(resolveCriterionName).filter(Boolean)
    : Array.isArray(criteria?.leafNames)
      ? criteria.leafNames
      : [];
  const payloadValue = payload?.value ?? {};
  const setPayloadValue = payload?.setValue;
  const isReadOnly =
    ui?.readOnly === true || ui?.loading === true || typeof setPayloadValue !== "function";
  const weightsByCriterion =
    payloadValue && typeof payloadValue === "object" && !Array.isArray(payloadValue)
      ? payloadValue.weightsByCriterion || {}
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
            setPayloadValue((previous) => ({
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
