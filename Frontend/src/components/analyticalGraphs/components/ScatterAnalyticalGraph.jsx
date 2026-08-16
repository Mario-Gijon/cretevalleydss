import { ScatterChart } from "@mui/x-charts";

import GraphUnavailable from "./GraphUnavailable.jsx";

const detailText = (details) => Object.entries(details || {}).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)).map(([key, value]) => `${key}: ${value}`).join(", ");

const ScatterAnalyticalGraph = ({ visualization }) => {
  const series = visualization?.data?.series;
  if (!Array.isArray(series) || !series.length) return <GraphUnavailable />;
  const normalized = series.map((item) => ({
    id: item.key,
    label: item.label || item.key,
    data: (item.points || []).filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y)).map((point) => ({ x: point.x, y: point.y, id: point.id, label: point.label, details: point.details })),
    valueFormatter: (point) => `${point.label || "Point"} (${point.x}, ${point.y})${detailText(point.details) ? ` — ${detailText(point.details)}` : ""}`,
  })).filter((item) => item.data.length);
  if (!normalized.length) return <GraphUnavailable />;
  return <ScatterChart data-testid="scatter-analytical-graph" height={340} series={normalized} xAxis={[visualization.xAxis || {}]} yAxis={[visualization.yAxis || {}]} grid={{ horizontal: true, vertical: true }} />;
};

export default ScatterAnalyticalGraph;
