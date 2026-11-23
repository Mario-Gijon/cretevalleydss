import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { Line } from "react-chartjs-2";
import { CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Tooltip as ChartTooltip } from "chart.js";

import GraphUnavailable from "./GraphUnavailable.jsx";
import { ANALYTICAL_LINE_STYLE, buildCartesianChartOptions, chartAccessibleLabel, chartColor, stableChartColor } from "../chartTheme.js";
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
    ctx.beginPath();
    if (marker.mode === "axis-tick") {
      ctx.moveTo(x, chartArea.bottom - 6);
      ctx.lineTo(x, chartArea.bottom + 2);
    } else {
      ctx.setLineDash([3, 4]);
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
    }
    ctx.stroke();
    ctx.restore();
  },
};

const categoryBandSeparatorsPlugin = {
  id: "categoricalCategorySeparators",
  afterDatasetsDraw(chart) {
    const separatorOptions = chart.options?.plugins?.categoricalCategorySeparators;
    const yScale = chart.scales?.y;
    const chartArea = chart.chartArea;
    if (!separatorOptions?.enabled || !Array.isArray(separatorOptions.categories) || !yScale || !chartArea) return;

    const categories = separatorOptions.categories
      .filter((category) => Number.isFinite(category?.value))
      .sort((left, right) => left.value - right.value);
    if (categories.length < 2) return;

    const centers = categories.map((category) => yScale.getPixelForValue(category.value));
    const { ctx } = chart;
    ctx.save();
    ctx.strokeStyle = "rgba(160,175,190,0.30)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    for (let index = 0; index < centers.length - 1; index += 1) {
      const midpoint = (centers[index] + centers[index + 1]) / 2;
      const pixelRatio = chart.currentDevicePixelRatio || 1;
      const physicalLineWidth = Math.max(1, Math.round(ctx.lineWidth * pixelRatio));
      const halfPixel = physicalLineWidth % 2 ? 0.5 / pixelRatio : 0;
      const y = Math.round(midpoint * pixelRatio) / pixelRatio + halfPixel;
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.right, y);
    }
    ctx.stroke();
    ctx.restore();
  },
};

const CATEGORICAL_SENSITIVITY_COLORS = [
  "#56B4E9",
  "#E69F00",
  "#CC79A7",
  "#009E73",
  "#8F7CDB",
  "#D55E00",
  "#F0E442",
  "#63B85D",
];

const withOpacity = (color, opacity) => {
  const match = /^#([\da-f]{6})$/i.exec(color || "");
  if (!match) return color;
  const value = match[1];
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

const seriesRole = (series) => series?.resultType === "collective"
  ? "collective"
  : isAlternativeSensitivitySeries(series) ? "alternative" : "boundary";
const seriesColor = (series, index, presentation, alternativeColors) => series.style?.color
  || alternativeColors?.get(series.alternativeId)
  || (presentation.stableSeriesColors
    ? stableChartColor(presentation.colorByAlternativeId && series.alternativeId
      ? `alternative:${series.alternativeId}`
      : series.key)
    : chartColor(index));

const buildAlternativeColors = (data, series, presentation) => {
  if (!presentation.categoryLineSegments) return null;
  const declaredOrder = Array.isArray(data.alternativeOrder) ? data.alternativeOrder : [];
  const seriesIds = series.map((item) => item.alternativeId).filter(Boolean);
  const order = declaredOrder.length
    ? [...declaredOrder, ...seriesIds.filter((id) => !declaredOrder.includes(id))]
    : [...new Set(seriesIds)].sort((left, right) => String(left).localeCompare(String(right), "en"));
  return new Map(order.map((id, index) => [
    id,
    CATEGORICAL_SENSITIVITY_COLORS[index % CATEGORICAL_SENSITIVITY_COLORS.length],
  ]));
};

const categoryOffset = (series, data, presentation) => {
  const range = Number.isFinite(presentation.categoryOffsetRange)
    ? Math.max(0, Math.min(0.2, presentation.categoryOffsetRange))
    : 0;
  if (!range || !series.alternativeId) return 0;
  const order = Array.isArray(data.alternativeOrder) ? data.alternativeOrder : [];
  const alternativeIds = order.length
    ? order
    : [...new Set((data.series || []).map((item) => item.alternativeId).filter(Boolean))]
      .sort((left, right) => String(left).localeCompare(String(right), "en"));
  const index = alternativeIds.indexOf(series.alternativeId);
  if (index < 0 || alternativeIds.length < 2) return 0;
  return ((index / (alternativeIds.length - 1)) * 2 - 1) * range;
};

const splitCategoryLineSegments = (series, data, presentation, displayLabels, categories) => series.flatMap((item) => {
  const values = Array.isArray(item.values) ? item.values : [];
  const runs = [];
  let currentRun = null;
  const saveRun = () => {
    if (currentRun) runs.push(currentRun);
    currentRun = null;
  };

  const isValidSample = (value) => value
    && typeof value === "object"
    && Number.isFinite(value.x)
    && Number.isFinite(value.y);
  const offset = categoryOffset(item, data, presentation);
  const displayLabel = displayLabels.get(String(item.key)) || item.label || item.key;
  const categoryLabel = (value) => categories.find((category) => category.value === value)?.label ?? String(value);
  const makeIntervalPoint = (sample, intervalStart, intervalEnd, intervalCategory) => ({
    ...sample,
    y: intervalCategory.value + offset,
    label: displayLabel,
    details: {
      ...(sample.details && typeof sample.details === "object" ? sample.details : {}),
      "Rendered interval": `${intervalStart.x}–${intervalEnd.x}`,
      "Segment category": categoryLabel(intervalCategory.value),
    },
  });

  for (let index = 0; index < values.length - 1; index += 1) {
    const left = values[index];
    const right = values[index + 1];
    if (!isValidSample(left) || !isValidSample(right) || right.x <= left.x) {
      saveRun();
      continue;
    }

    const intervalCategory = { value: left.y };
    if (currentRun && currentRun.categoryValue === left.y && currentRun.values.at(-1).x === left.x) {
      currentRun.values.push(makeIntervalPoint(right, left, right, intervalCategory));
      continue;
    }

    saveRun();
    currentRun = {
      categoryValue: left.y,
      values: [
        makeIntervalPoint(left, left, right, intervalCategory),
        makeIntervalPoint(right, left, right, intervalCategory),
      ],
    };
  }
  saveRun();

  return runs.map((run, segmentIndex) => ({
    source: item,
    segmentIndex,
    showLine: true,
    pointRadius: 0,
    pointHoverRadius: 0,
    values: run.values,
  }));
});

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

const SensitivityLegend = ({ series, presentation, displayLabels, alternativeColors }) => {
  if (!presentation.compactLegend) return null;
  const profileLegendTitle = presentation.profileLegendTitle || "CATEGORY BOUNDARIES";
  const profileLegendItemTitle = presentation.profileLegendItemTitle || "Boundary";
  const alternatives = series.filter((item) => seriesRole(item) === "alternative");
  const collectives = series.filter((item) => seriesRole(item) === "collective");
  const boundaries = series.filter((item) => seriesRole(item) === "boundary");
  const renderEntries = (items, role) => items.length ? <Box component="ul" aria-label={role === "alternative" ? "Visible alternatives" : role === "collective" ? "Visible collective results" : `Visible ${profileLegendTitle.toLowerCase()}`} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1.8, rowGap: 0.8, width: "100%", listStyle: "none", p: 0, m: 0 }}>
    {items.map((item) => {
      const color = seriesColor(item, series.indexOf(item), presentation, alternativeColors);
      const label = displayLabels.get(String(item.key)) || item.label || item.key;
      const dashed = role === "boundary" || item.style?.borderDash?.length;
      const legendRole = role === "alternative" ? "Individual result" : role === "collective" ? "Collective result" : profileLegendItemTitle;
      return <Box component="li" key={item.key} aria-label={`${legendRole}: ${label}`} sx={{ display: "flex", alignItems: "center", gap: 0.65, flex: "0 1 auto", minWidth: 0, maxWidth: "100%" }}>
        <Box aria-hidden="true" sx={{ width: 22, flex: "0 0 22px", borderTop: `${role === "alternative" ? 3 : 1.5}px ${dashed ? "dashed" : "solid"} ${color}`, opacity: role === "boundary" ? 0.78 : 1 }} />
        <Tooltip title={item.label || item.key} placement="top" arrow>
          <Typography variant="caption" component="span" sx={{ minWidth: 0, maxWidth: { xs: "calc(100vw - 110px)", sm: 360 }, overflowWrap: "anywhere", lineHeight: 1.25 }}>{label}</Typography>
        </Tooltip>
      </Box>;
    })}
  </Box> : null;

  return <Stack spacing={1} sx={{ width: "100%", minWidth: 0, mb: 0.8 }}>
    {alternatives.length ? <Box component="section" aria-label="Alternatives legend" sx={{ width: "100%", minWidth: 0 }}><Typography variant="overline" sx={{ display: "block", color: "text.secondary", lineHeight: 1.2, mb: 0.4 }}>ALTERNATIVES</Typography>{renderEntries(alternatives, "alternative")}</Box> : null}
    {collectives.length ? <Box component="section" aria-label="Collective results legend" sx={{ width: "100%", minWidth: 0 }}><Typography variant="overline" sx={{ display: "block", color: "text.secondary", lineHeight: 1.2, mb: 0.4 }}>COLLECTIVE RESULTS</Typography>{renderEntries(collectives, "collective")}</Box> : null}
    {boundaries.length ? <Box component="section" aria-label={`${profileLegendTitle.toLowerCase()} legend`} sx={{ width: "100%", minWidth: 0 }}><Typography variant="overline" sx={{ display: "block", color: "text.secondary", lineHeight: 1.2, mb: 0.4 }}>{profileLegendTitle}</Typography>{renderEntries(boundaries, "boundary")}</Box> : null}
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
  const alternativeColors = buildAlternativeColors(data, series, presentation);
  const categoryLineSegments = presentation.categoryLineSegments
    ? splitCategoryLineSegments(series, data, presentation, displayLabels, visualization.yAxis?.categories || [])
    : null;
  const showOriginalWeight = presentation.originalWeightMarker && configuredWeight !== null;
  const originalWeightLabel = presentation.originalWeightLabel
    || "Collective effective weight calculated by MCC";
  const originalWeightAriaLabel = presentation.originalWeightAriaLabel
    || "Original collective effective weight";
  const baseOptions = buildCartesianChartOptions({ xAxis: visualization.xAxis, yAxis: visualization.yAxis });
  const chartOptions = numericX ? {
    ...baseOptions,
    animation: presentation.categoryLineSegments ? false : baseOptions.animation,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      ...baseOptions.plugins,
      legend: presentation.compactLegend
        ? { ...baseOptions.plugins.legend, display: false }
        : {
            ...baseOptions.plugins.legend,
            labels: { ...baseOptions.plugins.legend.labels, usePointStyle: false },
          },
      ...(presentation.originalWeightMarker ? {
        originalWeightMarker: {
          enabled: showOriginalWeight,
          value: configuredWeight,
          mode: presentation.originalWeightMarkerMode,
        },
      } : {}),
      ...(presentation.categoryLineSegments ? {
        categoricalCategorySeparators: {
          enabled: true,
          categories: visualization.yAxis?.categories || [],
        },
      } : {}),
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
        grid: { display: !presentation.hideVerticalGridLines, color: "rgba(255,255,255,0.10)" },
      },
      y: {
        ...baseOptions.scales.y,
        type: "linear",
        min: visualization.yAxis?.min,
        max: visualization.yAxis?.max,
        category: false,
        afterBuildTicks: visualization.yAxis?.categories?.length
          ? (scale) => {
              scale.ticks = visualization.yAxis.categories.map((category) => ({ value: category.value }));
            }
          : undefined,
        ticks: {
          ...baseOptions.scales.y.ticks,
          stepSize: visualization.yAxis?.categories?.length ? 1 : undefined,
          autoSkip: visualization.yAxis?.categories?.length ? false : undefined,
        },
        grid: {
          display: !presentation.categoryLineSegments,
          color: "rgba(255,255,255,0.10)",
        },
      },
    },
  } : baseOptions;

  const accessibleLabel = chartAccessibleLabel(visualization, [
    ...(!numericX ? data.x : []),
    ...series.map((item) => item.label || item.key),
  ]);
  const chart = <Line
    role="img"
    aria-label={accessibleLabel}
    title={accessibleLabel}
    data-testid="line-analytical-graph"
    plugins={[
      ...(presentation.categoryLineSegments ? [categoryBandSeparatorsPlugin] : []),
      ...(presentation.originalWeightMarker ? [originalWeightMarkerPlugin] : []),
    ]}
    data={{
      ...(numericX ? {} : { labels: data.x }),
      datasets: (categoryLineSegments || series.map((item) => ({ source: item, values: item.values }))).map((renderItem, index) => {
        const item = renderItem.source;
        const role = seriesRole(item);
        const color = seriesColor(item, index, presentation, alternativeColors);
        const opacity = item.style?.opacity ?? (isStyledSensitivity && role === "boundary" ? 0.68 : 1);
        const configuredPointRadius = item.style?.pointRadius ?? (numericX ? 2.5 : ANALYTICAL_LINE_STYLE.pointRadius);
        const backgroundColor = isStyledSensitivity
          ? withOpacity(color, Math.min(opacity, 0.35))
          : `${color}36`;
        return {
          label: displayLabels.get(String(item.key)) || item.label || item.key,
          alternativeId: item.alternativeId,
          expertId: item.expertId,
          resultType: item.resultType,
          categorySegmentIndex: renderItem.segmentIndex,
          data: numericX ? renderItem.values.map((value, valueIndex) => (
            value && typeof value === "object"
              ? { ...value, label: displayLabels.get(String(item.key)) || value.label }
              : { x: data.x[valueIndex], y: value, label: displayLabels.get(String(item.key)) || item.label || item.key }
          )) : item.values,
          borderColor: opacity < 1 ? withOpacity(color, opacity) : color,
          backgroundColor,
          ...ANALYTICAL_LINE_STYLE,
          ...(numericX ? {
            showLine: categoryLineSegments ? renderItem.showLine : true,
            spanGaps: false,
            borderDash: item.style?.borderDash,
            borderWidth: item.style?.borderWidth ?? (isStyledSensitivity ? (role === "boundary" ? 1.5 : 3) : ANALYTICAL_LINE_STYLE.borderWidth),
            stepped: categoryLineSegments ? false : item.style?.stepped,
            pointRadius: categoryLineSegments ? renderItem.pointRadius : isStyledSensitivity ? 0 : (context) => {
              if (context.raw?.isConfiguredWeight) return Math.max(3.5, item.style?.pointRadius ?? 2.5);
              return configuredPointRadius;
            },
            pointHoverRadius: categoryLineSegments ? renderItem.pointHoverRadius : item.style?.pointHoverRadius ?? (isStyledSensitivity ? 4 : 5),
            pointStyle: undefined,
            rotation: 0,
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
    <SensitivityLegend series={series} presentation={presentation} displayLabels={displayLabels} alternativeColors={alternativeColors} />
    {showOriginalWeight ? <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 28, mb: 0.25 }}>
      <Tooltip title={`${originalWeightLabel} (full precision): ${String(configuredWeight)}`} arrow>
        <Typography component="span" tabIndex={0} aria-label={`${originalWeightAriaLabel} ${String(configuredWeight)}`} variant="caption" sx={{ color: "rgba(255,255,255,0.82)", borderBottom: "1px dotted rgba(245,173,92,0.8)" }}>
          Original weight: {configuredWeight.toFixed(3)}
        </Typography>
      </Tooltip>
    </Stack> : null}
    <Box sx={{ minHeight: 0, flex: 1 }}>{chart}</Box>
  </Box>;
};

export default LineAnalyticalGraph;
