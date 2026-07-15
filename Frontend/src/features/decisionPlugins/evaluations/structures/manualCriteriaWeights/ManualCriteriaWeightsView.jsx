import { forwardRef, useImperativeHandle } from "react";
import { Box, Stack, TextField, Typography } from "@mui/material";

const ManualCriteriaWeightsView = (
  {
    evaluationContext,
    evaluationPayload,
    setEvaluationPayload,
    readOnly,
    loading,
  },
  ref
) => {
  const criteria = Array.isArray(evaluationContext?.leafCriteria)
    ? evaluationContext.leafCriteria
        .map((criterion) => ({
          id: criterion?.id,
          name: criterion?.name,
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];
  const isReadOnly = readOnly === true || loading === true;
  const weightsByCriterion =
    evaluationPayload &&
    typeof evaluationPayload === "object" &&
    !Array.isArray(evaluationPayload)
      ? evaluationPayload.weightsByCriterion || {}
      : {};

  useImperativeHandle(ref, () => ({}));

  if (criteria.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No criteria available.
      </Typography>
    );
  }

  return (
    <Stack spacing={2.2} sx={{ width: "100%", maxWidth: "none", minWidth: 0 }}>
      <Box sx={{ width: "100%", maxWidth: "none", minWidth: 0 }}>
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
            Rate each criterion between 0 and 1
          </Typography>

          <Box sx={{ width: "100%", minWidth: 0 }}>
            <Stack spacing={1.1} sx={{ pt: 1 }}>
              {criteria.map((criterion) => (
                <Stack
                  key={criterion.id}
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  alignItems={{ xs: "stretch", md: "center" }}
                >
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: 800 }}>
                    {criterion.name}
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    color="secondary"
                    variant="outlined"
                    disabled={isReadOnly}
                    value={weightsByCriterion[criterion.id] ?? ""}
                    onChange={(event) => {
                      if (isReadOnly) return;

                      const raw = event.target.value;
                      setEvaluationPayload((previous) => ({
                        ...(previous && typeof previous === "object" ? previous : {}),
                        weightsByCriterion: {
                          ...((previous && previous.weightsByCriterion) || {}),
                          [criterion.id]: raw === "" ? "" : Number(raw),
                        },
                      }));
                    }}
                    inputProps={{ min: 0, max: 1, step: 0.1 }}
                    sx={{ width: { xs: "100%", md: 150 } }}
                  />
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
};

export default forwardRef(ManualCriteriaWeightsView);
