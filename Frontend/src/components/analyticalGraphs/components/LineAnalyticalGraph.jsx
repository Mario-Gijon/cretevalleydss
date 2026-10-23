import { Line } from "react-chartjs-2";
import { CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";

import GraphUnavailable from "./GraphUnavailable.jsx";
import { ANALYTICAL_LINE_STYLE, buildCartesianChartOptions, chartColor } from "../chartTheme.js";

ChartJS.register(CategoryScale, LineElement, LinearScale, PointElement, Legend, Tooltip);

const LineAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  if (!Array.isArray(data?.x) || !data.x.length || !Array.isArray(data?.series) || !data.series.length) return <GraphUnavailable />;
  const series = data.series.filter((item) => Array.isArray(item?.values));
  if (!series.length) return <GraphUnavailable />;
  const numericX = data.xScaleType === "linear";
  const baseOptions = buildCartesianChartOptions({ xAxis: visualization.xAxis, yAxis: visualization.yAxis });
  const chartOptions = numericX ? {
    ...baseOptions,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      ...baseOptions.plugins,
      legend: {
        ...baseOptions.plugins.legend,
        labels: { ...baseOptions.plugins.legend.labels, usePointStyle: false },
      },
      tooltip: {
        ...baseOptions.plugins.tooltip,
        callbacks: {
          title: (contexts) => contexts[0]?.raw?.label || "",
          label: (context) => {
            const raw = context.raw;
            if (!raw || typeof raw !== "object") {
              return `${context.dataset.label}: ${context.formattedValue}`;
            }
            const details = Object.entries(raw.details || {})
              .filter(([, value]) => value !== null && value !== undefined)
              .map(([key, value]) => `${key}: ${value}`);
            return details.length
              ? details
              : [`${context.dataset.label}: ${raw.y ?? "Unavailable"} at ${raw.x}`];
          },
        },
      },
    },
    scales: {
      ...baseOptions.scales,
      x: {
        ...baseOptions.scales.x,
        type: "linear",
        min: visualization.xAxis?.min,
        max: visualization.xAxis?.max,
        category: false,
        grid: { display: true, color: "rgba(255,255,255,0.10)" },
      },
      y: {
        ...baseOptions.scales.y,
        type: "linear",
        min: visualization.yAxis?.min,
        max: visualization.yAxis?.max,
        category: false,
        grid: { display: true, color: "rgba(255,255,255,0.10)" },
      },
    },
  } : baseOptions;
  return <Line
    data-testid="line-analytical-graph"
    data={{
      ...(numericX ? {} : { labels: data.x }),
      datasets: series.map((item, index) => ({
        label: item.label || item.key,
        data: numericX ? item.values.map((value, valueIndex) => (
          value && typeof value === "object"
            ? value
            : { x: data.x[valueIndex], y: value }
        )) : item.values,
        borderColor: chartColor(index),
        backgroundColor: `${chartColor(index)}36`,
        ...ANALYTICAL_LINE_STYLE,
        ...(numericX ? {
          showLine: true,
          spanGaps: false,
          borderDash: item.style?.borderDash,
          borderWidth: item.style?.borderWidth ?? ANALYTICAL_LINE_STYLE.borderWidth,
          pointRadius: (context) => context.raw?.isConfiguredWeight
            ? Math.max(3.5, item.style?.pointRadius ?? 2.5)
            : item.style?.pointRadius ?? 2.5,
          pointHoverRadius: item.style?.pointHoverRadius ?? 5,
          tension: 0,
        } : {}),
      })),
    }}
    options={chartOptions}
  />;
};

export default LineAnalyticalGraph;
