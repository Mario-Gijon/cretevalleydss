import { Box, Divider, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { FuzzyPreviewChart } from "../../../../components/FuzzyPreviewChart/FuzzyPreviewChart";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(value);

const DISCRETE_SEQUENCE_INLINE_LIMIT = 7;
const DISCRETE_SEQUENCE_EDGE_COUNT = 3;

const PreviewUnavailable = () => (
  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700 }}>
    Preview unavailable
  </Typography>
);

const PreviewRail = ({ children }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        borderRadius: 2.5,
        p: 1.05,
        bgcolor: alpha(theme.palette.common.white, 0.02),
        border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
      }}
    >
      {children}
    </Box>
  );
};

const RangeTrack = ({ points = [] }) => {
  const theme = useTheme();

  return (
    <Box sx={{ position: "relative", py: 1.5 }}>
      <Box
        sx={{
          height: 4,
          borderRadius: 999,
          bgcolor: alpha(theme.palette.info.main, 0.35),
        }}
      />
      {points.map((point) => (
        <Box
          key={point.key}
          sx={{
            position: "absolute",
            top: "50%",
            left: `${point.position}%`,
            transform: "translate(-50%, -50%)",
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: theme.palette.info.main,
            boxShadow: `0 0 0 2px ${alpha(theme.palette.common.black, 0.3)}`,
          }}
        />
      ))}
    </Box>
  );
};

const resolveNumericDefinition = (domain) => {
  const definition = domain?.definition;

  return isPlainObject(definition) ? definition : null;
};

const renderNumericContinuousPreview = (domain) => {
  const definition = resolveNumericDefinition(domain);

  if (
    !definition ||
    !isFiniteNumber(definition.min) ||
    !isFiniteNumber(definition.max) ||
    definition.min >= definition.max
  ) {
    return <PreviewUnavailable />;
  }

  return (
    <PreviewRail>
      <Stack spacing={0.55}>
        <RangeTrack />
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {formatNumber(definition.min)}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {formatNumber(definition.max)}
          </Typography>
        </Stack>
      </Stack>
    </PreviewRail>
  );
};

const buildDiscreteSequence = ({ min, max, step }) => {
  const values = [];
  const epsilon = Math.abs(step) * 1e-9;

  for (let index = 0; index < 5000; index += 1) {
    const nextValue = min + step * index;

    if (nextValue > max + epsilon) {
      break;
    }

    values.push(Number(nextValue.toFixed(12)));
  }

  if (values.length === 0) {
    return null;
  }

  const lastValue = values[values.length - 1];
  return Math.abs(lastValue - max) <= epsilon ? values : null;
};

const formatDiscreteSequenceSummary = (values) => {
  if (values.length <= DISCRETE_SEQUENCE_INLINE_LIMIT) {
    return values.map(formatNumber).join(" · ");
  }

  const leadingValues = values.slice(0, DISCRETE_SEQUENCE_EDGE_COUNT).map(formatNumber);
  const trailingValues = values.slice(-DISCRETE_SEQUENCE_EDGE_COUNT).map(formatNumber);
  return [...leadingValues, "…", ...trailingValues].join(" · ");
};

const renderNumericDiscretePreview = (domain) => {
  const definition = resolveNumericDefinition(domain);

  if (
    !definition ||
    !isFiniteNumber(definition.min) ||
    !isFiniteNumber(definition.max) ||
    !isFiniteNumber(definition.step) ||
    definition.min >= definition.max ||
    definition.step <= 0
  ) {
    return <PreviewUnavailable />;
  }

  const values = buildDiscreteSequence({
    min: definition.min,
    max: definition.max,
    step: definition.step,
  });

  if (!values) {
    return <PreviewUnavailable />;
  }

  return (
    <PreviewRail>
      <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.45 }}>
        {formatDiscreteSequenceSummary(values)}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
        {`${values.length} values`}
      </Typography>
    </PreviewRail>
  );
};

const renderLinguisticOrdinalPreview = (domain) => {
  const labels = Array.isArray(domain?.definition?.labels) ? domain.definition.labels : null;

  if (
    !labels ||
    labels.length === 0 ||
    labels.some(
      (label, index) =>
        !isPlainObject(label) ||
        typeof label.key !== "string" ||
        typeof label.label !== "string" ||
        label.index !== index
    )
  ) {
    return <PreviewUnavailable />;
  }

  return (
    <PreviewRail>
      <Box
        data-testid="ordered-linguistic-preview"
        data-mobile-direction="column"
        data-desktop-direction="row"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        {labels.map((label, index) => (
          <Stack
            key={label.key}
            direction={{ xs: "column", sm: "row" }}
            divider={
              index < labels.length - 1 ? (
                <Divider
                  flexItem
                  orientation="vertical"
                  sx={{
                    display: { xs: "none", sm: "block" },
                    mx: 0.9,
                    borderColor: (theme) => alpha(theme.palette.common.white, 0.12),
                  }}
                />
              ) : null
            }
            sx={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <Stack
              data-testid="ordered-linguistic-preview-item"
              direction="row"
              spacing={0.55}
              alignItems="center"
              sx={{
                minWidth: 0,
                flex: 1,
                py: 0.25,
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 800, flexShrink: 0 }}
              >
                {`${index + 1}:`}
              </Typography>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Tooltip title={label.label} arrow>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {label.label}
                  </Typography>
                </Tooltip>
              </Box>
            </Stack>

            {index < labels.length - 1 ? (
              <Divider
                sx={{
                  display: { xs: "block", sm: "none" },
                  my: 0.45,
                  borderColor: (theme) => alpha(theme.palette.common.white, 0.12),
                }}
              />
            ) : null}
          </Stack>
        ))}
      </Box>
    </PreviewRail>
  );
};

const renderLinguisticFuzzyPreview = (domain) => {
  const definition = domain?.definition;
  const labels = Array.isArray(definition?.labels) ? definition.labels : null;
  const membershipFunction =
    typeof definition?.membershipFunction === "string"
      ? definition.membershipFunction.trim()
      : "";

  if (
    !labels ||
    labels.length === 0 ||
    !membershipFunction ||
    labels.some(
      (label) =>
        !isPlainObject(label) ||
        typeof label.label !== "string" ||
        !Array.isArray(label.values)
    )
  ) {
    return <PreviewUnavailable />;
  }

  return (
    <PreviewRail>
      <Box data-testid="expression-domain-preview-fuzzy">
        <FuzzyPreviewChart
          labels={labels.map((label) => ({
            label: label.label,
            values: label.values,
          }))}
          membershipFunction={membershipFunction}
          height={{ xs: 192, sm: 204, lg: 216 }}
        />
      </Box>
    </PreviewRail>
  );
};

export const ExpressionDomainPreview = ({ domain }) => {
  const typeKey = typeof domain?.typeKey === "string" ? domain.typeKey.trim() : "";

  switch (typeKey) {
    case "numericContinuous":
      return renderNumericContinuousPreview(domain);
    case "numericDiscrete":
      return renderNumericDiscretePreview(domain);
    case "linguisticOrdinal":
      return renderLinguisticOrdinalPreview(domain);
    case "linguisticFuzzy":
      return renderLinguisticFuzzyPreview(domain);
    default:
      return <PreviewUnavailable />;
  }
};

export default ExpressionDomainPreview;
