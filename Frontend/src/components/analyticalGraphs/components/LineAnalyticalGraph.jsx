import { Alert, Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Line } from "react-chartjs-2";
import { CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Tooltip as ChartTooltip } from "chart.js";

import GraphUnavailable from "./GraphUnavailable.jsx";
import { ANALYTICAL_LINE_STYLE, buildCartesianChartOptions, chartColor, stableChartColor } from "../chartTheme.js";
import { isAlternativeSensitivitySeries, resolveVisualizationPresentation } from "../../../features/finishedIssueDialog/sections/resultsAnalysis/logic/resolveVisualizationPresentation.js";

ChartJS.register(CategoryScale, LineElement, LinearScale, PointElement, Legend, ChartTooltip);

const originalWeightMarkerPlugin = {
  id: "original-weight-marker",
  afterDatasetsDraw(chart) {
    const marker = chart.options?.plugins?.originalWeightMarker;
    const xScale = chart.scales?.x;
    const chartArea = chart.chartArea;
    if (!marker?.enabled || !Number.isFinite(marker.value) || !xScale || !chartArea) return;
    const x = xScale.getPixelForValue(marker.value);
    if (!Number.isFinite(x)) return;
    const { ctx } = chart;
    ctx.save();
    ctx.strokeStyle = "rgba(245, 173, 92, 0.78)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

const withOpacity = (color, opacity) => {
  const match = /^#([\da-f]{6})$/i.exec(color || "");
  if (!match) return color;
  const value = match[1];
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

const seriesRole = (series) => isAlternativeSensitivitySeries(series) ? "alternative" : "boundary";
const seriesColor = (series, index, presentation) => series.style?.color
  || (presentation.stableSeriesColors ? stableChartColor(series.key) : chartColor(index));

const buildSeriesDisplayLabels = (series) => {
  const counts = new Map();
  series.forEach((item) => {
    const label = item.label || item.key;
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return new Map(series.map((item) => {
    const label = item.label || item.key;
    const identity = String(item.key || "series");
    const uniqueLabel = counts.get(label) > 1 ? `${label} · ${identity.slice(-6)}` : label;
    return [identity, uniqueLabel];
  }));
};

const unavailableReasonText = (reason) => {
  const labels = {
    alternative_equals_boundary: "an alternative falls exactly on a category boundary",
    normalization_undefined: "normalization is undefined",
    closeness_undefined: "relative closeness is undefined",
    profile_closeness_order_not_strict: "consecutive category profiles do not have strictly ordered closeness",
    assignment_interval_undefined: "the category assignment interval is mathematically undetermined",
    proportional_redistribution_impossible_zero_complement: "the remaining criterion weights cannot be redistributed proportionally",
    invalid_scenario: "the sampled scenario is mathematically invalid",
  };
  if (typeof reason !== "string" || !reason.trim()) return "no unavailability reason was stored";
  return labels[reason] || reason.replaceAll("_", " ");
};

const unavailableSamples = (visualization) => {
  const explicit = visualization?.data?.unavailableSamples;
  if (Array.isArray(explicit)) return explicit;
  const unique = new Map();
  (Array.isArray(visualization?.data?.series) ? visualization.data.series : []).forEach((series) => {
    (Array.isArray(series?.values) ? series.values : []).forEach((point) => {
      if (point?.y !== null && point?.y !== undefined) return;
      const weight = point?.x ?? point?.details?.Weight;
      const reason = point?.details?.["Unavailable reason"];
      if (!Number.isFinite(weight)) return;
      unique.set(`${weight}:${reason || ""}`, { weight, reason });
    });
  });
  return [...unique.values()];
};

const unavailableGroups = (visualization) => {
  const groups = new Map();
  unavailableSamples(visualization).forEach((sample) => {
    if (!Number.isFinite(sample?.weight)) return;
    const reason = typeof sample.reason === "string" && sample.reason ? sample.reason : null;
    const weights = groups.get(reason) || new Set();
    weights.add(sample.weight);
    groups.set(reason, weights);
  });
  return [...groups.entries()].map(([reason, weights]) => ({
    reason,
    weights: [...weights].sort((left, right) => left - right),
  }));
};

const formattedWeight = (weight) => Number.isFinite(weight) ? weight.toFixed(2) : "";

const SensitivityLegend = ({ series, presentation, displayLabels }) => {
  if (!presentation.compactLegend) return null;
  const alternatives = series.filter((item) => seriesRole(item) === "alternative");
  const boundaries = series.filter((item) => seriesRole(item) === "boundary");
  const renderEntries = (items, role) => items.length ? <Box component="ul" aria-label={role === "alternative" ? "Visible alternatives" : "Visible category boundaries"} sx={{ display: "flex", flexWrap: "wrap", gap: 0.7, listStyle: "none", p: 0, m: 0 }}>
    {items.map((item) => {
      const color = seriesColor(item, series.indexOf(item), presentation);
      const label = displayLabels.get(String(item.key)) || item.label || item.key;
      const dashed = role === "boundary" || item.style?.borderDash?.length;
      return <Box component="li" key={item.key} title={label} aria-label={`${role === "alternative" ? "Alternative" : "Boundary"}: ${label}`} sx={{ display: "flex", alignItems: "center", gap: 0.65, minWidth: 0, maxWidth: { xs: "100%", sm: "48%", md: "32%" } }}>
        <Box aria-hidden="true" sx={{ width: 22, flex: "0 0 22px", borderTop: `${role === "alternative" ? 3 : 1.5}px ${dashed ? "dashed" : "solid"} ${color}`, opacity: role === "boundary" ? 0.78 : 1 }} />
        <Tooltip title={label} placement="top" arrow>
          <Typography variant="caption" component="span" sx={{ minWidth: 0, overflowWrap: "anywhere", lineHeight: 1.25 }}>{label}</Typography>
        </Tooltip>
      </Box>;
    })}
  </Box> : null;

  return <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.45, sm: 1.4 }} sx={{ mb: 0.5 }}>
    {alternatives.length ? <Stack spacing={0.35} sx={{ minWidth: 0 }}><Typography variant="overline" sx={{ color: "text.secondary", lineHeight: 1.2 }}>Alternatives</Typography>{renderEntries(alternatives, "alternative")}</Stack> : null}
    {boundaries.length ? <Stack spacing={0.35} sx={{ minWidth: 0 }}><Typography variant="overline" sx={{ color: "text.secondary", lineHeight: 1.2 }}>Category boundaries</Typography>{renderEntries(boundaries, "boundary")}</Stack> : null}
  </Stack>;
};

const unavailableSummary = (groups) => groups.map(({ reason, weights }) => {
  const weightList = weights.map(formattedWeight).join(", ");
  return `Weight${weights.length === 1 ? "" : "s"} ${weightList} unavailable: ${unavailableReasonText(reason)}.`;
}).join(" ");

const LineAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  if (!Array.isArray(data?.x) || !data.x.length || !Array.isArray(data?.series) || !data.series.length) return <GraphUnavailable />;
  const series = data.series.filter((item) => Array.isArray(item?.values));
  if (!series.length) return <GraphUnavailable />;
  const presentation = resolveVisualizationPresentation(visualization);
  const displayLabels = presentation.compactLegend
    ? buildSeriesDisplayLabels(series)
    : new Map(series.map((item) => [String(item.key), item.label || item.key]));
  const numericX = data.xScaleType === "linear";
  const isStyledSensitivity = Boolean(presentation.stableSeriesColors || presentation.compactLegend);
  const configuredWeight = Number.isFinite(data.configuredWeight) ? data.configuredWeight : null;
  const showOriginalWeight = presentation.originalWeightMarker && configuredWeight !== null;
  const missingSamples = presentation.showUnavailableSamples ? unavailableGroups(visualization) : [];
  const baseOptions = buildCartesianChartOptions({ xAxis: visualization.xAxis, yAxis: visualization.yAxis });
  const chartOptions = numericX ? {
    ...baseOptions,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      ...baseOptions.plugins,
      legend: presentation.compactLegend
        ? { ...baseOptions.plugins.legend, display: false }
        : {
            ...baseOptions.plugins.legend,
            labels: { ...baseOptions.plugins.legend.labels, usePointStyle: false },
          },
      ...(presentation.originalWeightMarker ? { originalWeightMarker: { enabled: showOriginalWeight, value: configuredWeight } } : {}),
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

  const chart = <Line
    data-testid="line-analytical-graph"
    plugins={presentation.originalWeightMarker ? [originalWeightMarkerPlugin] : []}
    data={{
      ...(numericX ? {} : { labels: data.x }),
      datasets: series.map((item, index) => {
        const role = seriesRole(item);
        const color = seriesColor(item, index, presentation);
        const opacity = item.style?.opacity ?? (isStyledSensitivity && role === "boundary" ? 0.68 : 1);
        const configuredPointRadius = item.style?.pointRadius ?? (numericX ? 2.5 : ANALYTICAL_LINE_STYLE.pointRadius);
        const backgroundColor = isStyledSensitivity
          ? withOpacity(color, Math.min(opacity, 0.35))
          : `${color}36`;
        return {
          label: displayLabels.get(String(item.key)) || item.label || item.key,
          data: numericX ? item.values.map((value, valueIndex) => (
            value && typeof value === "object"
              ? { ...value, label: displayLabels.get(String(item.key)) || value.label }
              : { x: data.x[valueIndex], y: value, label: displayLabels.get(String(item.key)) || item.label || item.key }
          )) : item.values,
          borderColor: opacity < 1 ? withOpacity(color, opacity) : color,
          backgroundColor,
          ...ANALYTICAL_LINE_STYLE,
          ...(numericX ? {
            showLine: true,
            spanGaps: false,
            borderDash: item.style?.borderDash,
            borderWidth: item.style?.borderWidth ?? (isStyledSensitivity ? (role === "boundary" ? 1.5 : 3) : ANALYTICAL_LINE_STYLE.borderWidth),
            pointRadius: (context) => {
              if (context.raw?.isConfiguredWeight) {
                if (isStyledSensitivity && role === "boundary") return configuredPointRadius;
                return Math.max(3.5, item.style?.pointRadius ?? 2.5);
              }
              return configuredPointRadius;
            },
            pointHoverRadius: item.style?.pointHoverRadius ?? (isStyledSensitivity && role === "boundary" ? 3 : 5),
            pointHitRadius: item.style?.pointHitRadius ?? (isStyledSensitivity && role === "boundary" ? 7 : undefined),
            tension: 0,
          } : {}),
        };
      }),
    }}
    options={chartOptions}
  />;

  if (!isStyledSensitivity) return chart;

  return <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
    <SensitivityLegend series={series} presentation={presentation} displayLabels={displayLabels} />
    {showOriginalWeight || presentation.methodDetails ? <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 28, mb: 0.25 }}>
      {showOriginalWeight ? <Tooltip title={`Collective effective weight calculated by MCC (full precision): ${String(configuredWeight)}`} arrow>
        <Typography component="span" tabIndex={0} aria-label={`Original collective effective weight ${String(configuredWeight)}`} variant="caption" sx={{ color: "rgba(255,255,255,0.82)", borderBottom: "1px dotted rgba(245,173,92,0.8)" }}>
          Original weight: {configuredWeight.toFixed(3)}
        </Typography>
      </Tooltip> : <Box />}
      {presentation.methodDetails ? <Tooltip title={presentation.methodDetails} placement="left" arrow>
        <IconButton size="small" aria-label="Sensitivity method details" sx={{ color: "text.secondary" }}><InfoOutlinedIcon fontSize="small" /></IconButton>
      </Tooltip> : null}
    </Stack> : null}
    <Box sx={{ minHeight: 0, flex: 1 }}>{chart}</Box>
    {missingSamples.length ? <Alert data-testid="line-unavailable-samples" severity="info" sx={{ mt: 0.65, py: 0, "& .MuiAlert-message": { py: 0.4, fontSize: "0.78rem" } }}>
      {unavailableSummary(missingSamples)} These samples remain blank; the line does not bridge them.
    </Alert> : null}
  </Box>;
};

export default LineAnalyticalGraph;
