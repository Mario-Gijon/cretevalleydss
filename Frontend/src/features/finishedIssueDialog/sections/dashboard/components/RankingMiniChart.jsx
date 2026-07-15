import { Box, Stack } from "@mui/material";

const RankingMiniChart = ({ ranking }) => {
  const scores = ranking.map((item) => item.score).filter(Number.isFinite);
  if (!scores.length) return null;
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 0);
  const range = max - min || 1;
  const zeroPosition = `${((0 - min) / range) * 100}%`;

  return <Stack spacing={0.7} sx={{ pt: 0.35 }}>
    {ranking.map((item) => {
      const score = Number.isFinite(item.score) ? item.score : 0;
      const start = score >= 0 ? (0 - min) / range : (score - min) / range;
      const width = Math.abs(score / range);
      return <Box key={item.id} sx={{ position: "relative", height: 7, borderRadius: 999, bgcolor: "rgba(255,255,255,0.055)", overflow: "hidden" }}>
        <Box sx={{ position: "absolute", left: zeroPosition, top: 0, bottom: 0, width: 1, bgcolor: "rgba(255,255,255,0.34)", zIndex: 1 }} />
        <Box sx={{ position: "absolute", left: `${start * 100}%`, width: `${Math.max(width * 100, 1)}%`, top: 1, bottom: 1, borderRadius: 999, bgcolor: score >= 0 ? "secondary.main" : "warning.main" }} />
      </Box>;
    })}
  </Stack>;
};

export default RankingMiniChart;
