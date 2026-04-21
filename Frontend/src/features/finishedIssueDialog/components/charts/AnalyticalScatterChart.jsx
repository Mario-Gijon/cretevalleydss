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

  const expertPoints = Object.entries(current.expert_points || {}).map(
    ([email, [x, y]]) => ({ x, y, email })
  );
  const collectivePoint = {
    x: current.collective_point?.[0],
    y: current.collective_point?.[1],
  };

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
        min: -1,
        max: 1,
        type: "linear",
        grid: { color: alpha("#fff", 0.14) },
        ticks: { color: alpha("#fff", 0.85) },
      },
      y: {
        min: -1,
        max: 1,
        grid: { color: alpha("#fff", 0.14) },
        ticks: { color: alpha("#fff", 0.85), stepSize: 0.4 },
      },
    },
  };

  return <Scatter ref={scatterPlotRef} data={chartData} options={chartOptions} />;
};
