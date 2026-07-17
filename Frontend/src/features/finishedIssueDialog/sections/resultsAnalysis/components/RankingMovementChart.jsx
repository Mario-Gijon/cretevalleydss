import { Box, Stack, Typography } from "@mui/material";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";

import { movementChartViewportSx, resultsPanelSx } from "../resultsAnalysis.styles.js";

const ALTERNATIVE_COLORS = ["#6fdc68", "#27d5e4", "#a960e8", "#ff6f91", "#f7c85c", "#66a3ff", "#ff8a65", "#7ad7c4", "#c7d36f", "#c08cff"];

const RankingMovementChart = ({ movement }) => {
  if (!movement.available) return <Box sx={resultsPanelSx}><Typography component="h2" sx={{ fontSize: 18, fontWeight: 950 }}>Ranking movement</Typography><Typography sx={{ mt: 1, color: "text.secondary", fontSize: 12 }}>{movement.reason}</Typography></Box>;
  const width = Math.max(760, movement.executions.length * 280);
  const height = Math.max(360, movement.alternatives.length * 42 + 110);
  const left = 80;
  const right = 50;
  const top = 45;
  const bottom = 65;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const xFor = (index) => left + (movement.executions.length === 1 ? plotWidth / 2 : (plotWidth * index) / (movement.executions.length - 1));
  const yFor = (position) => top + ((position - 1) / Math.max(1, movement.maxPosition - 1)) * plotHeight;

  return <Box sx={resultsPanelSx}>
    <Stack direction="row" spacing={1} alignItems="center"><TimelineRoundedIcon sx={{ color: "secondary.light" }} /><Box><Typography component="h2" sx={{ fontSize: 18, fontWeight: 950 }}>Ranking movement</Typography><Typography sx={{ color: "text.secondary", fontSize: 11.5 }}>Position changes across selected executions.</Typography></Box></Stack>
    <Box sx={movementChartViewportSx}><svg width={width} height={height} role="img" aria-label="Ranking movement chart">
      {Array.from({ length: movement.maxPosition }, (_, index) => index + 1).map((position) => <g key={`grid-${position}`}><line x1={left} x2={width - right} y1={yFor(position)} y2={yFor(position)} stroke="rgba(255,255,255,0.10)" strokeDasharray="4 5" /><text x={left - 18} y={yFor(position) + 4} textAnchor="end" fill="rgba(255,255,255,0.65)" fontSize="12">{position}</text></g>)}
      {movement.executions.map((execution, index) => <text key={execution.key} x={xFor(index)} y={height - 25} textAnchor="middle" fill="rgba(255,255,255,0.78)" fontSize="12">{execution.label}</text>)}
      {movement.alternatives.map((alternative, alternativeIndex) => {
        const color = ALTERNATIVE_COLORS[alternativeIndex % ALTERNATIVE_COLORS.length];
        const points = alternative.positions.map((entry, index) => ({ x: xFor(index), y: yFor(entry.position), position: entry.position }));
        const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
        return <g key={alternative.id}><path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{points.map((point, index) => <g key={`${alternative.id}-${index}`}><circle cx={point.x} cy={point.y} r="12" fill={color} stroke="rgba(3,10,17,0.95)" strokeWidth="2" /><text x={point.x} y={point.y + 4} textAnchor="middle" fill="#06111c" fontSize="11" fontWeight="900">{point.position}</text></g>)}</g>;
      })}
    </svg></Box>
    <Stack direction="row" spacing={1.2} useFlexGap flexWrap="wrap" sx={{ mt: 0.8, maxHeight: 82, overflow: "auto" }}>{movement.alternatives.map((alternative, index) => <Stack key={alternative.id} direction="row" spacing={0.55} alignItems="center"><Box sx={{ width: 13, height: 4, borderRadius: 99, bgcolor: ALTERNATIVE_COLORS[index % ALTERNATIVE_COLORS.length] }} /><Typography noWrap title={alternative.name} sx={{ maxWidth: 150, fontSize: 10.8 }}>{alternative.name}</Typography></Stack>)}</Stack>
  </Box>;
};

export default RankingMovementChart;
