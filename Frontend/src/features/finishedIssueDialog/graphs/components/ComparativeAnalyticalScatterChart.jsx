import { alpha } from "@mui/material/styles";
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ScatterController,
  LinearScale,
  PointElement,
  Tooltip as CTooltip,
  Legend,
  Title,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { buildComparativeAnalyticalScatterData } from "../logic/buildComparativeAnalyticalScatterData.js";

ChartJS.register(ScatterController, LinearScale, PointElement, CTooltip, Legend, Title, zoomPlugin);

const range = (points, coordinate) => {
  const values = points.map((point) => point[coordinate]);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = minimum === maximum ? 1 : Math.max((maximum - minimum) * 0.2, 0.2);
  return { min: minimum - padding, max: maximum + padding };
};

const coordinates = (point) => `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;

export const ComparativeAnalyticalScatterChart = ({ groups = [], scatterPlotRef, compact = false }) => {
  const points = groups.flatMap((group) => [...group.expertPoints, group.collectivePoint]);
  if (!points.length) return null;
  const chartData = buildComparativeAnalyticalScatterData({ groups, compact });
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top", labels: { color: alpha("#fff", 0.85) } },
      tooltip: { callbacks: { label: (ctx) => ctx.raw.pointType === "collective" ? `Collective — ${ctx.raw.executionLabel} ${coordinates(ctx.raw)}` : `${ctx.raw.label} — ${ctx.raw.executionLabel} ${coordinates(ctx.raw)}` } },
      zoom: { zoom: { wheel: { enabled: !compact }, pinch: { enabled: !compact }, mode: "xy" }, pan: { enabled: !compact, mode: "xy" } },
    },
    scales: {
      x: { type: "linear", ...range(points, "x"), grid: { color: alpha("#fff", 0.14) }, ticks: { color: alpha("#fff", 0.85) } },
      y: { ...range(points, "y"), grid: { color: alpha("#fff", 0.14) }, ticks: { color: alpha("#fff", 0.85) } },
    },
  };
  return <Scatter ref={scatterPlotRef} data={chartData} options={chartOptions} datasetIdKey="id" />;
};

export default ComparativeAnalyticalScatterChart;
