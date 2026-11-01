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

export const MAX_AXIS_LABEL_LENGTH = 26;

export const truncateAxisLabel = (label, maximumLength = MAX_AXIS_LABEL_LENGTH) => {
  const text = String(label ?? "");
  return text.length > maximumLength ? `${text.slice(0, maximumLength - 1)}…` : text;
};

export const chartAccessibleLabel = (visualization, labels = []) => {
  const title = typeof visualization?.title === "string" ? visualization.title.trim() : "Data visualization";
  const description = typeof visualization?.description === "string" ? visualization.description.trim() : "";
  const fullLabels = [...new Set(labels.filter((label) => typeof label === "string" && label.length > MAX_AXIS_LABEL_LENGTH))];
  return [title, description, fullLabels.length ? `Full labels: ${fullLabels.join("; ")}` : ""].filter(Boolean).join(". ");
};

const categoryTickLabels = (categories) => {
  if (!Array.isArray(categories)) return null;
  const labels = new Map(categories.filter((entry) => Number.isFinite(entry?.value) && typeof entry?.label === "string" && entry.label.trim()).map((entry) => [entry.value, entry.label.trim()]));
  return labels.size ? labels : null;
};

const axis = ({ label, stacked = false, category = false, categories, hideTickLabels = false }) => {
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
    display: !hideTickLabels,
    ...(labels ? {
      callback: (value) => truncateAxisLabel(labels.get(Number(value)) ?? value),
    } : category ? {
      callback(value) {
        const fullLabel = this.getLabelForValue(value);
        return typeof fullLabel === "string" ? truncateAxisLabel(fullLabel) : fullLabel;
      },
    } : {}),
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
        x: axis({ label: xAxis.label, stacked, categories: xAxis.categories, hideTickLabels: xAxis.hideTickLabels }),
        y: axis({ label: yAxis.label, stacked, category: true, categories: yAxis.categories, hideTickLabels: yAxis.hideTickLabels }),
      }
    : {
        x: axis({ label: xAxis.label, stacked, category: true, categories: xAxis.categories, hideTickLabels: xAxis.hideTickLabels }),
        y: axis({ label: yAxis.label, stacked, categories: yAxis.categories, hideTickLabels: yAxis.hideTickLabels }),
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

const hashIdentity = (identity) => {
  let hash = 2166136261;
  for (const character of String(identity || "series")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const hslToHex = (hue, saturation, lightness) => {
  const normalizedSaturation = saturation / 100;
  const normalizedLightness = lightness / 100;
  const chroma = (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const section = hue / 60;
  const secondary = chroma * (1 - Math.abs((section % 2) - 1));
  const [red, green, blue] = section < 1 ? [chroma, secondary, 0]
    : section < 2 ? [secondary, chroma, 0]
      : section < 3 ? [0, chroma, secondary]
        : section < 4 ? [0, secondary, chroma]
          : section < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];
  const offset = normalizedLightness - chroma / 2;
  return [red, green, blue]
    .map((value) => Math.round((value + offset) * 255).toString(16).padStart(2, "0"))
    .join("");
};

/** Stable identity-based colors for series whose order can change in the UI. */
export const stableChartColor = (identity) => {
  const hash = hashIdentity(identity);
  return `#${hslToHex(hash % 360, 68, 64)}`;
};
