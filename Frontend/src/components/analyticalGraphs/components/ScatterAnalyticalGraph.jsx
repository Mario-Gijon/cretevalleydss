import { Scatter } from "react-chartjs-2";
import { Chart as ChartJS, Legend, LinearScale, PointElement, ScatterController, Tooltip } from "chart.js";

import GraphUnavailable from "./GraphUnavailable.jsx";
import { buildCartesianChartOptions, chartColor } from "../chartTheme.js";
import {
  buildPreferenceDistributionDatasets,
  getPreferenceDistributionMetrics,
  isIndividualPreferenceDistribution,
  PREFERENCE_DISTRIBUTION_CLUSTER_SPACING_PX,
} from "../logic/preferenceDistributionMatrix.js";
import { preferenceDistributionMatrixPlugin } from "../logic/preferenceDistributionMatrixPlugin.js";

ChartJS.register(ScatterController, LinearScale, PointElement, Legend, Tooltip, preferenceDistributionMatrixPlugin);

const detailText = (details) => Object.entries(details || {}).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)).map(([key, value]) => `${key}: ${value}`).join(", ");

const makeIntegerTicks = (min, max) => (scale) => {
  scale.ticks = Array.from({ length: Math.max(0, Math.floor(max - min + 1)) }, (_, index) => ({ value: min + index }));
};

const ScatterAnalyticalGraph = ({ visualization }) => {
  const series = visualization?.data?.series;
  if (!Array.isArray(series) || !series.length) return <GraphUnavailable />;
  const isPreferenceDistribution = isIndividualPreferenceDistribution(visualization);
  const preferenceMetrics = isPreferenceDistribution ? getPreferenceDistributionMetrics(visualization) : null;
  const minRank = Number.isFinite(visualization.xAxis?.min) ? visualization.xAxis.min : 1;
  const maxRank = Number.isFinite(visualization.xAxis?.max) ? visualization.xAxis.max : minRank;
  const chartSeries = isPreferenceDistribution ? buildPreferenceDistributionDatasets(series) : series;
  const normalized = chartSeries.map((item, index) => ({
    label: item.label || item.key,
    expertKey: isPreferenceDistribution ? item.expertKey : undefined,
    data: (item.points || []).filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y)).map((point) => ({ x: point.x, y: point.y, id: point.id, label: point.label, details: point.details, expertKey: point.expertKey })),
    backgroundColor: `${chartColor(index)}d9`,
    borderColor: chartColor(index),
    pointStyle: isPreferenceDistribution ? "circle" : undefined,
    pointRadius: isPreferenceDistribution ? 5.5 : 5,
    pointHoverRadius: isPreferenceDistribution ? 6.5 : 7,
    pointHitRadius: isPreferenceDistribution ? 2 : undefined,
    pointBorderColor: isPreferenceDistribution ? "rgba(7,13,22,0.94)" : undefined,
    pointBorderWidth: isPreferenceDistribution ? 1.5 : undefined,
    ...(isPreferenceDistribution ? {
      backgroundColor: (context) => {
        const hoveredExpertKey = context.chart.$hoveredExpertKey;
        return hoveredExpertKey && context.dataset.expertKey !== hoveredExpertKey
          ? `${chartColor(index)}38`
          : `${chartColor(index)}e6`;
      },
      hoverBackgroundColor: `${chartColor(index)}ff`,
      hoverBorderColor: "#ffffff",
      hoverBorderWidth: 2,
      pointRadius: (context) => context.chart.$hoveredExpertKey === context.dataset.expertKey ? 6.5 : 5.5,
    } : {}),
  })).filter((item) => item.data.length);
  if (!normalized.length) return <GraphUnavailable />;

  const baseOptions = buildCartesianChartOptions({
    xAxis: visualization.xAxis,
    yAxis: visualization.yAxis,
    tooltipLabel: (context) => {
      const point = context.raw;
      return `${point.label || "Point"} (${point.x}, ${point.y})${detailText(point.details) ? ` — ${detailText(point.details)}` : ""}`;
    },
  });
  const chartOptions = isPreferenceDistribution
    ? {
        ...baseOptions,
        animation: false,
        interaction: { mode: "nearest", intersect: true },
        plugins: {
          ...baseOptions.plugins,
          preferenceDistributionMatrix: {
            enabled: true,
            clusterSpacingPx: PREFERENCE_DISTRIBUTION_CLUSTER_SPACING_PX,
          },
          legend: {
            ...baseOptions.plugins.legend,
            onClick: (_event, legendItem, legend) => {
              const chart = legend?.chart;
              if (!chart || !Number.isInteger(legendItem?.datasetIndex)) return;
              const index = legendItem.datasetIndex;
              chart.setDatasetVisibility(index, !chart.isDatasetVisible(index));
              chart.update();
            },
            onHover: (_event, legendItem, legend) => {
              const chart = legend?.chart;
              if (!chart || !Number.isInteger(legendItem?.datasetIndex)) return;
              chart.$hoveredExpertKey = chart.data.datasets[legendItem.datasetIndex]?.expertKey ?? null;
              chart.update("none");
            },
            onLeave: (_event, _legendItem, legend) => {
              const chart = legend?.chart;
              if (!chart) return;
              chart.$hoveredExpertKey = null;
              chart.update("none");
            },
            labels: { ...baseOptions.plugins.legend.labels, usePointStyle: true, boxWidth: 12 },
          },
          tooltip: {
            ...baseOptions.plugins.tooltip,
            position: "nearest",
            callbacks: {
              title: (contexts) => contexts[0]?.raw?.details?.expert || "Expert",
              label: (context) => {
                const { details = {} } = context.raw;
                const rank = details.rank ?? context.raw.x;
                const rankCount = Number.isFinite(maxRank) ? maxRank - minRank + 1 : null;
                return [
                  `Criterion: ${details.criterion || "—"}`,
                  `Preference rank: ${rank}${Number.isFinite(rankCount) ? ` of ${rankCount}` : ""}`,
                  `Utility: ${details.utility ?? "—"}`,
                ];
              },
            },
          },
        },
        scales: {
          ...baseOptions.scales,
          x: {
            ...baseOptions.scales.x,
            min: minRank - 0.5,
            max: maxRank + 0.5,
            grid: { display: false },
            afterBuildTicks: makeIntegerTicks(minRank, maxRank),
            ticks: { ...baseOptions.scales.x.ticks, maxRotation: 0, minRotation: 0 },
          },
          y: {
            ...baseOptions.scales.y,
            min: visualization.yAxis?.min,
            max: visualization.yAxis?.max,
            reverse: true,
            grid: { display: false },
            afterBuildTicks: makeIntegerTicks(1, preferenceMetrics.criterionCount),
            ticks: { ...baseOptions.scales.y.ticks, stepSize: 1 },
          },
        },
      }
    : baseOptions;

  return <Scatter data-testid="scatter-analytical-graph" data={{ datasets: normalized }} options={chartOptions} />;
};

export default ScatterAnalyticalGraph;
