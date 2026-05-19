import { MenuItem, Stack, TextField, Typography } from "@mui/material";

export const BwmCriteriaWeightsEditor = ({
  criterionNames,
  payload,
  onPayloadChange,
}) => {
  const bwmPayload = payload || {};

  return (
    <Stack spacing={1}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
        <TextField
          select
          size="small"
          label="Best criterion"
          value={bwmPayload.bestCriterion || ""}
          onChange={(event) => {
            const bestCriterion = event.target.value;
            onPayloadChange({
              ...bwmPayload,
              bestCriterion,
              bestToOthers: {
                ...(bwmPayload.bestToOthers || {}),
                [bestCriterion]: 1,
              },
            });
          }}
          sx={{ minWidth: 220 }}
        >
          {(criterionNames || []).map((criterionName) => (
            <MenuItem key={criterionName} value={criterionName}>
              {criterionName}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Worst criterion"
          value={bwmPayload.worstCriterion || ""}
          onChange={(event) => {
            const worstCriterion = event.target.value;
            onPayloadChange({
              ...bwmPayload,
              worstCriterion,
              othersToWorst: {
                ...(bwmPayload.othersToWorst || {}),
                [worstCriterion]: 1,
              },
            });
          }}
          sx={{ minWidth: 220 }}
        >
          {(criterionNames || []).map((criterionName) => (
            <MenuItem key={criterionName} value={criterionName}>
              {criterionName}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Set values from 1 to 9. Self comparisons must be 1.
      </Typography>

      <Stack direction="row" flexWrap="wrap" gap={2}>
        {(criterionNames || []).map((criterionName) => (
          <Stack key={criterionName} spacing={0.5} alignItems="center">
            <Typography variant="caption">Best vs {criterionName}</Typography>
            <TextField
              type="number"
              size="small"
              color="info"
              value={bwmPayload?.bestToOthers?.[criterionName] ?? ""}
              disabled={criterionName === bwmPayload.bestCriterion}
              onChange={(event) => {
                const value = event.target.value;
                const parsed = value === "" ? "" : Number(value);
                onPayloadChange({
                  ...bwmPayload,
                  bestToOthers: {
                    ...(bwmPayload.bestToOthers || {}),
                    [criterionName]:
                      criterionName === bwmPayload.bestCriterion
                        ? 1
                        : parsed === "" || Number.isNaN(parsed)
                          ? ""
                          : Math.max(1, Math.min(9, parsed)),
                  },
                });
              }}
              inputProps={{ min: 1, max: 9, step: 1 }}
              sx={{ width: 100 }}
            />
          </Stack>
        ))}
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={2}>
        {(criterionNames || []).map((criterionName) => (
          <Stack key={criterionName} spacing={0.5} alignItems="center">
            <Typography variant="caption">{criterionName} vs Worst</Typography>
            <TextField
              type="number"
              size="small"
              color="info"
              value={bwmPayload?.othersToWorst?.[criterionName] ?? ""}
              disabled={criterionName === bwmPayload.worstCriterion}
              onChange={(event) => {
                const value = event.target.value;
                const parsed = value === "" ? "" : Number(value);
                onPayloadChange({
                  ...bwmPayload,
                  othersToWorst: {
                    ...(bwmPayload.othersToWorst || {}),
                    [criterionName]:
                      criterionName === bwmPayload.worstCriterion
                        ? 1
                        : parsed === "" || Number.isNaN(parsed)
                          ? ""
                          : Math.max(1, Math.min(9, parsed)),
                  },
                });
              }}
              inputProps={{ min: 1, max: 9, step: 1 }}
              sx={{ width: 100 }}
            />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

export default BwmCriteriaWeightsEditor;
