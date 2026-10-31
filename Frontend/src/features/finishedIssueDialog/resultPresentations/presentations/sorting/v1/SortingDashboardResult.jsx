import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  sortingFinalCategoryAlternativesSx,
  sortingFinalCategorySx,
  sortingFinalResultSx,
} from "./sortingResultGrid.styles.js";

const isValidMetricDefinition = (metric) => typeof metric?.key === "string"
  && typeof metric.label === "string"
  && Number.isFinite(metric.minimum)
  && Number.isFinite(metric.maximum)
  && metric.maximum > metric.minimum;

const isValidMetricValue = (value, metric) => isValidMetricDefinition(metric)
  && typeof value === "number"
  && Number.isFinite(value)
  && value >= metric.minimum
  && value <= metric.maximum;

const metricPrecisionFor = (metric) => Number.isInteger(metric?.precision) && metric.precision >= 0 && metric.precision <= 10
  ? metric.precision
  : 4;

const sharedDecisionThresholdFor = (metric) => metric?.referenceScope === "shared-decision-threshold" &&
  metric.visualization === "bounded-position" &&
  metric.comparableAcrossAlternatives === true &&
  isValidMetricValue(metric.threshold, metric)
  ? metric.threshold
  : null;

const isNonEmptyMetricReference = (reference, metric) => typeof reference?.id === "string" && reference.id.length > 0
  && typeof reference.label === "string" && reference.label.length > 0
  && isValidMetricValue(reference.value, metric);

const toScalePercent = (value, metric) => `${Number((((value - metric.minimum) / (metric.maximum - metric.minimum)) * 100).toPrecision(12))}%`;

const CategoryHeader = ({ category }) => (
  <Typography variant="subtitle1" title={category.label} sx={{ minWidth: 0, fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>
    {category.label}
  </Typography>
);

const MetricScale = ({ value, metric, references, theme }) => (
  <Box
    data-testid="sorting-metric-scale"
    data-metric-key={metric.key}
    data-metric-value={value}
    data-domain-minimum={metric.minimum}
    data-domain-maximum={metric.maximum}
    role={metric.visualization === "contextual-reference" || sharedDecisionThresholdFor(metric) !== null ? "img" : undefined}
    aria-label={metric.visualization === "contextual-reference"
      ? `${metric.label} ${value.toFixed(metricPrecisionFor(metric))} on a ${metric.minimum} to ${metric.maximum} scale; reference profiles: ${references.map(({ label, value: referenceValue }) => `${label} ${referenceValue.toFixed(metricPrecisionFor(metric))}`).join(", ")}`
      : sharedDecisionThresholdFor(metric) !== null
        ? `${metric.label} ${value.toFixed(metricPrecisionFor(metric))} on a ${metric.minimum} to ${metric.maximum} scale; decision threshold ${sharedDecisionThresholdFor(metric)}`
      : undefined}
    aria-hidden={metric.visualization === "contextual-reference" || sharedDecisionThresholdFor(metric) !== null ? undefined : "true"}
    sx={{ position: "relative", height: 12, mx: 0.45, overflow: "visible" }}
  >
    <Box
      sx={{
        position: "absolute",
        top: "50%",
        left: 0,
        right: 0,
        height: "1px",
        transform: "translateY(-50%)",
        bgcolor: alpha(theme.palette.secondary.main, 0.34),
      }}
    />
    {references
      .filter((reference) => isValidMetricValue(reference.value, metric))
      .map((reference) => (
        <Box
          key={reference.id}
          data-testid="sorting-metric-reference"
          data-metric-reference-label={reference.label}
          data-reference-value={reference.value}
          aria-hidden="true"
          title={reference.label}
          style={{ left: toScalePercent(reference.value, metric) }}
          sx={{
            position: "absolute",
            top: 0,
            height: 10,
            zIndex: 1,
            borderLeft: `1px ${metric.visualization === "contextual-reference" ? "solid" : "dashed"} ${alpha(theme.palette.text.secondary, 0.8)}`,
            transform: "translateX(-50%)",
          }}
        />
      ))}
    {sharedDecisionThresholdFor(metric) !== null && (
      <Box
        data-testid="sorting-metric-threshold"
        data-threshold-value={sharedDecisionThresholdFor(metric)}
        aria-hidden="true"
        title={`Decision threshold ${sharedDecisionThresholdFor(metric)}`}
        style={{ left: toScalePercent(sharedDecisionThresholdFor(metric), metric) }}
        sx={{
          position: "absolute",
          top: 0,
          height: 10,
          zIndex: 1,
          borderLeft: `1px dashed ${alpha(theme.palette.text.secondary, 0.8)}`,
          transform: "translateX(-50%)",
        }}
      />
    )}
    <Box
      data-testid="sorting-metric-point"
      data-metric-key={metric.key}
      data-metric-value={value}
      aria-hidden="true"
      title={metric.visualization === "contextual-reference" ? "Alternative priority" : undefined}
      style={{ left: toScalePercent(value, metric) }}
      sx={{
        position: "absolute",
        top: "50%",
        width: 7,
        height: 7,
        borderRadius: "50%",
        bgcolor: "secondary.main",
        transform: "translate(-50%, -50%)",
        ...(sharedDecisionThresholdFor(metric) !== null ? { zIndex: 2 } : {}),
      }}
    />
  </Box>
);

const MetricLegend = ({ metric }) => {
  const threshold = sharedDecisionThresholdFor(metric);
  if (threshold === null) return null;

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      justifyContent="flex-end"
      alignItems="center"
      columnGap={1.2}
      rowGap={0.35}
      role="group"
      aria-label="Global AHP priority scale legend"
      data-testid="sorting-metric-legend"
      sx={{ alignSelf: "flex-end", px: 0.9, pb: 0.35, minWidth: 0 }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} data-testid="sorting-metric-legend-priority">
        <Box aria-hidden="true" sx={{ width: 7, height: 7, flex: "0 0 auto", borderRadius: "50%", bgcolor: "secondary.main" }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem", lineHeight: 1.2, whiteSpace: "nowrap" }}>
          {metric.label}
        </Typography>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={0.5} data-testid="sorting-metric-legend-threshold">
        <Box aria-hidden="true" sx={{ width: 8, height: 11, flex: "0 0 auto", borderLeft: "1px dashed", borderColor: "text.secondary" }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem", lineHeight: 1.2, whiteSpace: "nowrap" }}>
          Decision threshold · {String(threshold)}
        </Typography>
      </Stack>
    </Stack>
  );
};

const SortingAlternativeRow = ({ alternative, range, theme, metric }) => {
  const metricValue = metric && isValidMetricValue(alternative.metricValue, metric)
    ? alternative.metricValue
    : null;
  const precision = metricPrecisionFor(metric);
  const metricLabel = metricValue === null ? null : metricValue.toFixed(precision);
  const accessibleLabel = metricLabel
    ? `${alternative.name}, ${metric.label} ${metricLabel}`
    : alternative.name;
  const contextualReferences = metric?.visualization === "contextual-reference" && Array.isArray(alternative.metricReferences)
    ? alternative.metricReferences.filter((reference) => isNonEmptyMetricReference(reference, metric))
    : [];
  const metricReferences = metric?.visualization === "contextual-reference"
    ? contextualReferences
    : metric?.visualization === "bounded-position" && range
      ? [
        { id: "lower-boundary", label: "Lower category boundary", value: range.lower },
        { id: "upper-boundary", label: "Upper category boundary", value: range.upper },
      ].filter((reference) => isValidMetricValue(reference.value, metric))
      : [];
  const showScale = metricValue !== null && (metric?.visualization === "bounded-position" ||
    (metric?.visualization === "contextual-reference" && metricReferences.length > 0));

  return (
    <Box
      component="li"
      aria-label={accessibleLabel}
      data-testid="sorting-final-alternative"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: showScale ? 0.55 : 0,
        minWidth: 0,
        px: 0.9,
        py: 0.7,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        "&:last-of-type": { borderBottom: 0 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1, minWidth: 0 }}>
        <Typography variant="body2" title={alternative.name} sx={{ minWidth: 0, fontWeight: 550, overflowWrap: "anywhere", lineHeight: 1.3 }}>
          {alternative.name}
        </Typography>
        {metricLabel !== null && (
          <Typography
            variant="body2"
            color="text.secondary"
            aria-label={`${metric.label} ${metricLabel}`}
            title={`${metric.label}: ${metricLabel}`}
            data-testid="sorting-metric-value"
            data-metric-key={metric.key}
            data-metric-value={metricValue}
            sx={{ flex: "0 0 auto", fontSize: "0.8rem", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
          >
            {metricLabel}
          </Typography>
        )}
      </Box>
      {showScale && (
        <MetricScale
          value={metricValue}
          metric={metric}
          references={metricReferences}
          theme={theme}
        />
      )}
    </Box>
  );
};

const SortingDashboardResult = ({ result }) => {
  const theme = useTheme();
  const metric = isValidMetricDefinition(result.metric) ? result.metric : null;
  const sortWithinCategory = metric?.ordering === "descending-within-category" && metric.comparableAcrossAlternatives === true;

  return (
    <Box sx={sortingFinalResultSx}>
      {metric && (
        sharedDecisionThresholdFor(metric) !== null
          ? <MetricLegend metric={metric} />
          : (
            <Typography
              variant="caption"
              color="text.secondary"
              data-testid="sorting-metric-label"
              aria-label={metric.comparableAcrossAlternatives === false
                ? `${metric.label}; values use alternative-specific reference profiles`
                : metric.label}
              title={metric.comparableAcrossAlternatives === false
                ? "Values are calculated relative to each alternative's own reference profiles."
                : metric.label}
              sx={{ alignSelf: "flex-end", pr: 0.9, pb: 0.15, lineHeight: 1.2 }}
            >
              {metric.label}
            </Typography>
          )
      )}
      <Box role="list" aria-label="Final sorting by category" data-testid="sorting-final-result" sx={{ width: "100%", minWidth: 0 }}>
        {result.categories.map((category) => {
          const alternatives = category.alternatives
            .map((alternative, index) => ({ alternative, index }))
            .sort((left, right) => {
              const leftValue = sortWithinCategory && isValidMetricValue(left.alternative.metricValue, metric)
                ? left.alternative.metricValue
                : null;
              const rightValue = sortWithinCategory && isValidMetricValue(right.alternative.metricValue, metric)
                ? right.alternative.metricValue
                : null;
              if (leftValue !== null && rightValue !== null && leftValue !== rightValue) return rightValue - leftValue;
              if ((leftValue !== null) !== (rightValue !== null)) return leftValue !== null ? -1 : 1;
              return left.index - right.index;
            })
            .map(({ alternative }) => alternative);

          return (
            <Box
              key={category.id}
              component="section"
              role="listitem"
              aria-label={`${category.label}: ${alternatives.length} ${alternatives.length === 1 ? "alternative" : "alternatives"}`}
              data-testid="sorting-final-category"
              sx={{ ...sortingFinalCategorySx, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.42)}` }}
            >
              <CategoryHeader category={category} />
              {alternatives.length ? (
                <Box component="ul" aria-label={`${category.label} alternatives`} data-testid="sorting-final-category-body" sx={sortingFinalCategoryAlternativesSx}>
                  {alternatives.map((alternative) => (
                    <SortingAlternativeRow
                      key={alternative.id}
                      alternative={alternative}
                      range={category.metricRange}
                      theme={theme}
                      metric={metric}
                    />
                  ))}
                </Box>
              ) : (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.65}
                  aria-label="No alternatives in this category"
                  data-testid="sorting-final-empty-category"
                  sx={{ minWidth: 0, alignSelf: { md: "center" }, py: 0.3, color: "text.secondary" }}
                >
                  <InboxOutlinedIcon
                    aria-hidden="true"
                    data-testid="sorting-final-empty-category-icon"
                    sx={{ flex: "0 0 auto", fontSize: 17, color: (currentTheme) => alpha(currentTheme.palette.secondary.light, 0.68) }}
                  />
                  <Typography variant="body2" sx={{ minWidth: 0, fontSize: "0.8rem", lineHeight: 1.35 }}>
                    No alternatives in this category
                  </Typography>
                </Stack>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default SortingDashboardResult;
