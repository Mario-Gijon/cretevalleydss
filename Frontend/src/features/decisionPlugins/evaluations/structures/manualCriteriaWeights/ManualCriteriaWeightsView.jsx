import { Box, Chip, Stack, TextField, Typography } from "@mui/material";

const ManualCriteriaWeightsView = ({
  decisionContext,
  evaluation,
  setEvaluation,
  collectiveEvaluation,
  readOnly,
  loading,
}) => {
  const criteria = Array.isArray(decisionContext?.leafCriteria)
    ? decisionContext.leafCriteria
        .map((criterion) => ({
          id: criterion?.id,
          name: criterion?.name,
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];
  const isReadOnly = readOnly === true || loading === true;
  const weightsByCriterion =
    evaluation &&
    typeof evaluation === "object" &&
    !Array.isArray(evaluation)
      ? evaluation.weightsByCriterion || {}
      : {};
  const collectiveWeightsByCriterion =
    collectiveEvaluation &&
    typeof collectiveEvaluation === "object" &&
    !Array.isArray(collectiveEvaluation) &&
    collectiveEvaluation.weightsByCriterion &&
    typeof collectiveEvaluation.weightsByCriterion === "object" &&
    !Array.isArray(collectiveEvaluation.weightsByCriterion)
      ? collectiveEvaluation.weightsByCriterion
      : {};

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
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
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
                        const nextEvaluation = structuredClone(evaluation ?? {});
                        nextEvaluation.weightsByCriterion = {
                          ...(nextEvaluation.weightsByCriterion || {}),
                          [criterion.id]: raw === "" ? "" : Number(raw),
                        };
                        setEvaluation(nextEvaluation);
                      }}
                      inputProps={{ min: 0, max: 1, step: 0.1 }}
                      sx={{ width: { xs: "100%", md: 150 } }}
                    />
                    {typeof collectiveWeightsByCriterion[criterion.id] === "number" ? (
                      <Chip
                        size="small"
                        color="secondary"
                        variant="outlined"
                        label={`Collective ${collectiveWeightsByCriterion[criterion.id]}`}
                        sx={{ height: 25, fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap" }}
                      />
                    ) : null}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
};

export default ManualCriteriaWeightsView;
