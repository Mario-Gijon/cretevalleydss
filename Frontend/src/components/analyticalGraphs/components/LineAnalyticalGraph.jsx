import { Box, Stack, Tooltip, Typography } from "@mui/material";
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
  const duplicatePositions = new Map();
  series.forEach((item) => {
    const label = item.label || item.key;
    if (counts.get(label) < 2) return;
    const identities = series
      .filter((candidate) => (candidate.label || candidate.key) === label)
      .map((candidate) => String(candidate.key || "series"))
      .sort((left, right) => left.localeCompare(right, "en"));
    duplicatePositions.set(String(item.key || "series"), identities.indexOf(String(item.key || "series")) + 1);
  });
  return new Map(series.map((item) => {
    const label = item.label || item.key;
    const identity = String(item.key || "series");
    const uniqueLabel = counts.get(label) > 1 ? `${label} (${duplicatePositions.get(identity)})` : label;
    return [identity, uniqueLabel];
  }));
};

const SensitivityLegend = ({ series, presentation, displayLabels }) => {
  if (!presentation.compactLegend) return null;
  const alternatives = series.filter((item) => seriesRole(item) === "alternative");
  const boundaries = series.filter((item) => seriesRole(item) === "boundary");
  const renderEntries = (items, role) => items.length ? <Box component="ul" aria-label={role === "alternative" ? "Visible alternatives" : "Visible category boundaries"} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1.8, rowGap: 0.8, width: "100%", listStyle: "none", p: 0, m: 0 }}>
    {items.map((item) => {
      const color = seriesColor(item, series.indexOf(item), presentation);
      const label = displayLabels.get(String(item.key)) || item.label || item.key;
      const dashed = role === "boundary" || item.style?.borderDash?.length;
      return <Box component="li" key={item.key} aria-label={`${role === "alternative" ? "Alternative" : "Boundary"}: ${label}`} sx={{ display: "flex", alignItems: "center", gap: 0.65, flex: "0 1 auto", minWidth: 0, maxWidth: "100%" }}>
        <Box aria-hidden="true" sx={{ width: 22, flex: "0 0 22px", borderTop: `${role === "alternative" ? 3 : 1.5}px ${dashed ? "dashed" : "solid"} ${color}`, opacity: role === "boundary" ? 0.78 : 1 }} />
        <Tooltip title={item.label || item.key} placement="top" arrow>
          <Typography variant="caption" component="span" sx={{ minWidth: 0, maxWidth: { xs: "calc(100vw - 110px)", sm: 360 }, overflowWrap: "anywhere", lineHeight: 1.25 }}>{label}</Typography>
        </Tooltip>
      </Box>;
    })}
  </Box> : null;

  return <Stack spacing={1} sx={{ width: "100%", minWidth: 0, mb: 0.8 }}>
    {alternatives.length ? <Box component="section" aria-label="Alternatives legend" sx={{ width: "100%", minWidth: 0 }}><Typography variant="overline" sx={{ display: "block", color: "text.secondary", lineHeight: 1.2, mb: 0.4 }}>ALTERNATIVES</Typography>{renderEntries(alternatives, "alternative")}</Box> : null}
    {boundaries.length ? <Box component="section" aria-label="Category boundaries legend" sx={{ width: "100%", minWidth: 0 }}><Typography variant="overline" sx={{ display: "block", color: "text.secondary", lineHeight: 1.2, mb: 0.4 }}>CATEGORY BOUNDARIES</Typography>{renderEntries(boundaries, "boundary")}</Box> : null}
  </Stack>;
};

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
            pointRadius: isStyledSensitivity ? 0 : (context) => {
              if (context.raw?.isConfiguredWeight) return Math.max(3.5, item.style?.pointRadius ?? 2.5);
              return configuredPointRadius;
            },
            pointHoverRadius: item.style?.pointHoverRadius ?? (isStyledSensitivity ? 4 : 5),
            pointHitRadius: item.style?.pointHitRadius ?? (isStyledSensitivity ? (role === "boundary" ? 8 : 12) : undefined),
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
    {showOriginalWeight ? <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 28, mb: 0.25 }}>
      <Tooltip title={`Collective effective weight calculated by MCC (full precision): ${String(configuredWeight)}`} arrow>
        <Typography component="span" tabIndex={0} aria-label={`Original collective effective weight ${String(configuredWeight)}`} variant="caption" sx={{ color: "rgba(255,255,255,0.82)", borderBottom: "1px dotted rgba(245,173,92,0.8)" }}>
          Original weight: {configuredWeight.toFixed(3)}
        </Typography>
      </Tooltip>
    </Stack> : null}
    <Box sx={{ minHeight: 0, flex: 1 }}>{chart}</Box>
  </Box>;
};

export default LineAnalyticalGraph;
