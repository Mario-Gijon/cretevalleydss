import { Box, Typography, useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { buildProjectedExpertDistances } from "../logic/buildProjectedExpertDistances.js";

const ProjectedExpertDistances = ({ projections = [], phase = null }) => {
  const available = projections.map((projection) => ({ projection, rows: buildProjectedExpertDistances(projection) })).filter(({ rows }) => rows.length);
  if (!available.length) return <Typography variant="body2" color="text.secondary">No stored expert–collective analytical projection is available for the selected executions.</Typography>;
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${Math.min(available.length, 3)}, minmax(0, 1fr))` }, gap: 1.4, alignItems: "start" }}>{available.map(({ projection, rows }) => <DistanceChart key={projection.key} projection={projection} rows={rows} phase={phase} />)}</Box>;
};

const DistanceBar = ({ rows, ...props }) => {
  const color = rows[props.dataIndex]?.closest ? "#9cf7ff" : "#398eaf";
  return <rect {...props} fill={color} stroke={rows[props.dataIndex]?.closest ? "#eaffff" : "#53c6d6"} strokeWidth={1.1} rx={4} />;
};

const DistanceChart = ({ projection, rows, phase }) => {
  const theme = useTheme();
  const labels = rows.map((row) => row.email || row.label || row.identity || "Expert");
  const minWidth = Math.max(300, rows.length * 92);
  return <Box sx={{ minWidth: 0 }} data-phase={phase ?? ""}><Typography variant="caption" color="text.secondary">Projected distance to collective</Typography><Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.8, color: projection.color }}>{projection.displayLabel}</Typography><Box sx={{ overflowX: "auto", maxWidth: "100%" }}><Box sx={{ minWidth, height: 280 }}><BarChart height={280} xAxis={[{ scaleType: "band", data: labels }]} series={[{ data: rows.map((row) => row.distance), label: "Projected distance", color: theme.palette.secondary.main }]} hideLegend borderRadius={5} barLabel={(item) => Number.isFinite(item.value) ? item.value.toFixed(3) : null} margin={{ top: 28, right: 16, bottom: 58, left: 62 }} grid={{ horizontal: true }} slots={{ bar: (props) => <DistanceBar {...props} rows={rows} /> }} slotProps={{ barLabel: { style: { fill: theme.palette.text.primary, fontSize: 11, fontWeight: 700 } }, tooltip: { trigger: "item" } }} /></Box></Box><Typography variant="caption" color="text.secondary">Closest experts are highlighted; equal displayed distances share the same emphasis.</Typography></Box>;
};

export default ProjectedExpertDistances;
