export const ANALYTICAL_CHART_COLORS = [
  "#53c6d6",
  "#8f7cff",
  "#f5ad5c",
  "#8fca7a",
  "#e889b5",
  "#6faee8",
];

export const ANALYTICAL_LINE_STYLE = {
  borderWidth: 2.5,
  pointRadius: 0,
  pointHoverRadius: 5,
  tension: 0.25,
};

const categoryTickLabels = (categories) => {
  if (!Array.isArray(categories)) return null;
  const labels = new Map(categories.filter((entry) => Number.isFinite(entry?.value) && typeof entry?.label === "string" && entry.label.trim()).map((entry) => [entry.value, entry.label.trim()]));
  return labels.size ? labels : null;
};

const axis = ({ label, stacked = false, category = false, categories }) => {
  const labels = categoryTickLabels(categories);
  return {
  stacked,
  grid: {
    display: !category,
    color: "rgba(255,255,255,0.10)",
  },
  border: { color: "rgba(255,255,255,0.16)" },
  ticks: {
    color: "rgba(255,255,255,0.72)",
    maxRotation: 35,
    minRotation: 0,
    ...(labels ? { callback: (value) => labels.get(Number(value)) ?? value } : {}),
  },
  title: label ? { display: true, text: label, color: "rgba(255,255,255,0.82)", font: { weight: "600" } } : { display: false },
  };
};

const commonPlugins = (tooltipLabel) => ({
  legend: {
    position: "top",
    labels: { color: "rgba(255,255,255,0.82)", boxWidth: 12, usePointStyle: true },
  },
  tooltip: {
    backgroundColor: "rgba(5,15,25,0.96)",
    titleColor: "#ffffff",
    bodyColor: "rgba(255,255,255,0.86)",
    borderColor: "rgba(83,198,214,0.35)",
    borderWidth: 1,
    ...(tooltipLabel ? { callbacks: { label: tooltipLabel } } : {}),
  },
});

export const buildCartesianChartOptions = ({ xAxis = {}, yAxis = {}, horizontal = false, stacked = false, tooltipLabel } = {}) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "nearest", intersect: false },
  indexAxis: horizontal ? "y" : "x",
  plugins: commonPlugins(tooltipLabel),
  scales: horizontal
    ? {
        x: axis({ label: xAxis.label, stacked, categories: xAxis.categories }),
        y: axis({ label: yAxis.label, stacked, category: true, categories: yAxis.categories }),
      }
    : {
        x: axis({ label: xAxis.label, stacked, category: true, categories: xAxis.categories }),
        y: axis({ label: yAxis.label, stacked, categories: yAxis.categories }),
      },
});

export const buildRadialChartOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: commonPlugins(),
  scales: {
    r: {
      angleLines: { color: "rgba(255,255,255,0.14)" },
      grid: { color: "rgba(255,255,255,0.14)" },
      pointLabels: { color: "rgba(255,255,255,0.78)", font: { size: 11 } },
      ticks: { display: false, backdropColor: "transparent" },
    },
  },
});

export const chartColor = (index) => ANALYTICAL_CHART_COLORS[index % ANALYTICAL_CHART_COLORS.length];
