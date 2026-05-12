import { alpha, useTheme } from "@mui/material/styles";
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

ChartJS.register(
  ScatterController,
  LinearScale,
  PointElement,
  CTooltip,
  Legend,
  Title,
  zoomPlugin
);

/**
 * Scatter de analisis con puntos de expertos y colectivo.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element|null}
 */
export const AnalyticalScatterChart = ({ data, phase, scatterPlotRef }) => {
  const theme = useTheme();
  const current = data?.[phase];
  if (!current) return null;

  const parsePoint = (point) => {
    if (!Array.isArray(point) || point.length !== 2) return null;
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  };

  let expertPoints = [];

  if (Array.isArray(current.expertPoints)) {
    expertPoints = current.expertPoints
      .map((entry, index) => {
        const x = Number(entry?.x);
        const y = Number(entry?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        const label =
          typeof entry?.label === "string" && entry.label.trim()
            ? entry.label.trim()
            : `Expert ${index + 1}`;
        return { x, y, email: label };
      })
      .filter(Boolean);
  } else if (
    current.expert_points_by_email &&
    typeof current.expert_points_by_email === "object"
  ) {
    expertPoints = Object.entries(current.expert_points_by_email)
      .map(([email, point]) => {
        const parsed = parsePoint(point);
        if (!parsed) return null;
        return { ...parsed, email: String(email) };
      })
      .filter(Boolean);
  } else if (Array.isArray(current.expert_points)) {
    const labels = Array.isArray(current.expert_labels) ? current.expert_labels : [];
    expertPoints = current.expert_points
      .map((point, index) => {
        const parsed = parsePoint(point);
        if (!parsed) return null;
        const labelCandidate = labels[index];
        const email =
          typeof labelCandidate === "string" && labelCandidate.trim()
            ? labelCandidate.trim()
            : `Expert ${index + 1}`;
        return { ...parsed, email };
      })
      .filter(Boolean);
  }

  const collectiveCandidate = current.collectivePoint || current.collective_point;
  const parsedCollective = Array.isArray(collectiveCandidate)
    ? parsePoint(collectiveCandidate)
    : (Number.isFinite(Number(collectiveCandidate?.x)) &&
      Number.isFinite(Number(collectiveCandidate?.y))
      ? { x: Number(collectiveCandidate.x), y: Number(collectiveCandidate.y) }
      : null);

  const collectivePoint = parsedCollective || { x: 0, y: 0 };

  if (!expertPoints.length) return null;

  const allX = [...expertPoints.map((point) => point.x), collectivePoint.x];
  const allY = [...expertPoints.map((point) => point.y), collectivePoint.y];
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const xPadding = minX === maxX ? 1 : Math.max((maxX - minX) * 0.2, 0.2);
  const yPadding = minY === maxY ? 1 : Math.max((maxY - minY) * 0.2, 0.2);

  const chartData = {
    datasets: [
      {
        label: "Experts",
        data: expertPoints,
        backgroundColor: alpha(theme.palette.info.main, 0.85),
        pointRadius: 8,
        pointHoverRadius: 11,
      },
      {
        label: "Collective",
        data: [collectivePoint],
        backgroundColor: alpha(theme.palette.error.main, 0.95),
        pointRadius: 10,
        pointStyle: "rectRot",
        pointHoverRadius: 13,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: { color: alpha("#fff", 0.85) },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const { datasetIndex, raw } = ctx;
            if (datasetIndex === 0) {
              return `${raw.email} (${raw.x.toFixed(2)}, ${raw.y.toFixed(2)})`;
            }
            return `Collective (${raw.x.toFixed(2)}, ${raw.y.toFixed(2)})`;
          },
        },
      },
      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "xy" },
        pan: { enabled: true, mode: "xy" },
      },
    },
    scales: {
      x: {
        min: minX - xPadding,
        max: maxX + xPadding,
        type: "linear",
        grid: { color: alpha("#fff", 0.14) },
        ticks: { color: alpha("#fff", 0.85) },
      },
      y: {
        min: minY - yPadding,
        max: maxY + yPadding,
        grid: { color: alpha("#fff", 0.14) },
        ticks: { color: alpha("#fff", 0.85), stepSize: 0.4 },
      },
    },
  };

  return <Scatter ref={scatterPlotRef} data={chartData} options={chartOptions} />

};
