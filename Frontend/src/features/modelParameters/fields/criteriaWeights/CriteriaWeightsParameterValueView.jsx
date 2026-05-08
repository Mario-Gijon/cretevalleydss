import { Stack, Typography } from "@mui/material";

const fmt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
};

export const CriteriaWeightsParameterValueView = ({ value, leafNames }) => {
  const arr = Array.isArray(value) ? value : [];
  if (!arr.length) return <Typography variant="body2">—</Typography>;

  return (
    <Stack spacing={0.4}>
      {arr.map((w, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 120 }}>
            {leafNames?.[i] || `Criterion ${i + 1}`}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 850 }}>{fmt(w)}</Typography>
        </Stack>
      ))}
    </Stack>
  );
};

export default CriteriaWeightsParameterValueView;
