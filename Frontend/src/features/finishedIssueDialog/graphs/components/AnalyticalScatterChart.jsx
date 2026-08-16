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
import { buildAnalyticalScatterViewModel } from "../logic/buildAnalyticalScatterViewModel.js";
import { collectiveColorFor } from "../logic/analyticalScatterColors.js";
import { buildExpertCollectiveConnectors } from "../logic/buildExpertCollectiveConnectors.js";
import { expertCollectiveConnectorPlugin } from "../logic/expertCollectiveConnectorPlugin.js";

ChartJS.register(
  ScatterController,
  LinearScale,
  PointElement,
  CTooltip,
  Legend,
  Title,
  zoomPlugin,
  expertCollectiveConnectorPlugin
);

/**
 * Scatter de analisis con puntos de expertos y colectivo.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element|null}
 */
export const AnalyticalScatterChart = ({ data, phase, scatterPlotRef, compact = false, color }) => {
  const viewModel = buildAnalyticalScatterViewModel({ data, phase });

  if (!viewModel) return null;

  const { expertPoints, collectivePoint, xRange, yRange } = viewModel;
  const connectors = buildExpertCollectiveConnectors({ expertPoints, collectivePoint });

  const chartData = {
    datasets: [
      {
        label: "Experts",
        data: expertPoints,
        backgroundColor: alpha(color, 0.85),
        pointRadius: compact ? 4 : 8,
        pointHoverRadius: compact ? 6 : 11,
      },
      {
        label: "Collective",
        data: [collectivePoint],
        backgroundColor: alpha(collectiveColorFor(color), 0.98),
        borderColor: alpha(color, 0.95),
        borderWidth: 2,
        pointRadius: compact ? 5 : 10,
        pointStyle: "rectRot",
        pointHoverRadius: compact ? 7 : 13,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !compact,
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
      expertCollectiveConnectors: { groups: [{ color, connectors }] },
      zoom: {
        zoom: { wheel: { enabled: !compact }, pinch: { enabled: !compact }, mode: "xy" },
        pan: { enabled: !compact, mode: "xy" },
      },
    },
    scales: {
      x: {
        min: xRange.min,
        max: xRange.max,
        type: "linear",
        grid: { color: alpha("#fff", 0.14) },
        ticks: { color: alpha("#fff", 0.85), font: { size: compact ? 9 : 12 }, maxTicksLimit: compact ? 4 : undefined },
      },
      y: {
        min: yRange.min,
        max: yRange.max,
        grid: { color: alpha("#fff", 0.14) },
        ticks: { color: alpha("#fff", 0.85), stepSize: 0.4, font: { size: compact ? 9 : 12 }, maxTicksLimit: compact ? 4 : undefined },
      },
    },
  };

  return <Scatter ref={scatterPlotRef} data={chartData} options={chartOptions} />

};
