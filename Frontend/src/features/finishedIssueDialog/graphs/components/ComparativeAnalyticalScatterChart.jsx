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
import { buildComparativeAnalyticalScatterData } from "../logic/buildComparativeAnalyticalScatterData.js";
import { buildExpertCollectiveConnectors } from "../logic/buildExpertCollectiveConnectors.js";
import { expertCollectiveConnectorPlugin } from "../logic/expertCollectiveConnectorPlugin.js";

ChartJS.register(ScatterController, LinearScale, PointElement, CTooltip, Legend, Title, expertCollectiveConnectorPlugin);

const range = (points, coordinate) => {
  const values = points.map((point) => point[coordinate]);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = minimum === maximum ? 1 : Math.max((maximum - minimum) * 0.2, 0.2);
  return { min: minimum - padding, max: maximum + padding };
};

const coordinates = (point) => `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
const expertLabel = (point) => point.label || point.email || point.identity || "Expert";

const expertTooltipLabel = ({ raw, groups }) => {
  const label = expertLabel(raw);
  const peers = groups.flatMap((group) =>
    group.expertPoints
      .filter((point) => expertLabel(point) === label)
      .map((point) => ({ ...point, executionLabel: group.tooltipLabel || group.groupLabel })),
  ).filter((point) => point.executionLabel === raw.executionLabel);
  const duplicateLabel = peers.length > 1;
  const uniqueIdentity = (field, value) =>
    value && value !== label && peers.filter((point) => point[field] === value).length === 1;
  const identity = uniqueIdentity("email", raw.email)
    ? raw.email
    : uniqueIdentity("identity", raw.identity)
      ? raw.identity
      : null;
  const disambiguator = duplicateLabel && identity ? ` (${identity})` : "";
  return `${label}${disambiguator} — ${raw.executionLabel} ${coordinates(raw)}`;
};

export const ComparativeAnalyticalScatterChart = ({ groups = [], compact = false }) => {
  const points = groups.flatMap((group) => [...group.expertPoints, group.collectivePoint]);
  if (!points.length) return null;
  const chartData = buildComparativeAnalyticalScatterData({ groups, compact });
  const connectorGroups = groups.map((group) => ({ color: group.color, connectors: buildExpertCollectiveConnectors({ expertPoints: group.expertPoints, collectivePoint: group.collectivePoint, executionLabel: group.tooltipLabel || group.groupLabel }) }));
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top", labels: { color: alpha("#fff", 0.85) } },
      tooltip: { callbacks: { label: (ctx) => ctx.raw.pointType === "collective" ? `Collective — ${ctx.raw.executionLabel} ${coordinates(ctx.raw)}` : expertTooltipLabel({ raw: ctx.raw, groups }) } },
      expertCollectiveConnectors: { groups: connectorGroups },
    },
    scales: {
      x: { type: "linear", ...range(points, "x"), grid: { color: alpha("#fff", 0.14) }, ticks: { color: alpha("#fff", 0.85) } },
      y: { ...range(points, "y"), grid: { color: alpha("#fff", 0.14) }, ticks: { color: alpha("#fff", 0.85) } },
    },
  };
  return <Scatter data={chartData} options={chartOptions} datasetIdKey="id" />;
};

export default ComparativeAnalyticalScatterChart;
