import { Stack, Typography } from "@mui/material";

const fmt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
};

export const FuzzyCriteriaWeightsParameterValueView = ({ value, leafNames }) => {
  const arr = Array.isArray(value) ? value : [];
  if (!arr.length) return <Typography variant="body2">—</Typography>;

  return (
    <Stack spacing={0.5}>
      {arr.map((tri, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 120 }}>
            {leafNames?.[i] || `Criterion ${i + 1}`}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 850 }}>
            {Array.isArray(tri) ? `l ${fmt(tri[0])} · m ${fmt(tri[1])} · u ${fmt(tri[2])}` : "—"}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
};

export default FuzzyCriteriaWeightsParameterValueView;
