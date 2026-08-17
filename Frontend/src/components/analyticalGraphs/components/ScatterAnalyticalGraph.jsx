import { Scatter } from "react-chartjs-2";
import { Chart as ChartJS, Legend, LinearScale, PointElement, ScatterController, Tooltip } from "chart.js";

import GraphUnavailable from "./GraphUnavailable.jsx";
import { buildCartesianChartOptions, chartColor } from "../chartTheme.js";

ChartJS.register(ScatterController, LinearScale, PointElement, Legend, Tooltip);

const detailText = (details) => Object.entries(details || {}).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)).map(([key, value]) => `${key}: ${value}`).join(", ");

const ScatterAnalyticalGraph = ({ visualization }) => {
  const series = visualization?.data?.series;
  if (!Array.isArray(series) || !series.length) return <GraphUnavailable />;
  const normalized = series.map((item, index) => ({
    label: item.label || item.key,
    data: (item.points || []).filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y)).map((point) => ({ x: point.x, y: point.y, id: point.id, label: point.label, details: point.details })),
    backgroundColor: `${chartColor(index)}d9`,
    borderColor: chartColor(index),
    pointRadius: 5,
    pointHoverRadius: 7,
  })).filter((item) => item.data.length);
  if (!normalized.length) return <GraphUnavailable />;
  return <Scatter
    data-testid="scatter-analytical-graph"
    data={{ datasets: normalized }}
    options={buildCartesianChartOptions({
      xAxis: visualization.xAxis,
      yAxis: visualization.yAxis,
      tooltipLabel: (context) => {
        const point = context.raw;
        return `${point.label || "Point"} (${point.x}, ${point.y})${detailText(point.details) ? ` — ${detailText(point.details)}` : ""}`;
      },
    })}
  />;
};

export default ScatterAnalyticalGraph;
