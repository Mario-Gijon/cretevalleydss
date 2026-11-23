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
import { buildAnalyticalScatterViewModel } from "../logic/buildAnalyticalScatterViewModel.js";
import { collectiveColorFor } from "../logic/analyticalScatterColors.js";
import { buildExpertCollectiveConnectors } from "../logic/buildExpertCollectiveConnectors.js";
import { expertCollectiveConnectorPlugin } from "../logic/expertCollectiveConnectorPlugin.js";
import { Box, Stack, Typography } from "@mui/material";

ChartJS.register(
  ScatterController,
  LinearScale,
  PointElement,
  CTooltip,
  Legend,
  Title,
  expertCollectiveConnectorPlugin
);

/**
 * Scatter de analisis con puntos de expertos y colectivo.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element|null}
 */
export const AnalyticalScatterChart = ({ data, phase, compact = false, color, variant, showConnectors = true }) => {
  const viewModel = buildAnalyticalScatterViewModel({ data, phase });

  if (!viewModel) return null;
  const isCategoricalProjection = variant === "categorical" || viewModel.projectionSemantics === "categorical-pattern";

  const {
    expertPoints,
    expertMarkerGroups,
    collectivePoint,
    overlapGroups,
    xRange,
    yRange,
  } = viewModel;
  const connectors = !showConnectors
    ? []
    : buildExpertCollectiveConnectors({ expertPoints, collectivePoint });

  const chartData = {
    datasets: [
      {
        label: "Experts",
        expertCollectiveRole: "experts",
        data: expertMarkerGroups.map((group) => ({
          ...group.experts[0],
          x: group.x,
          y: group.y,
          experts: group.experts,
          expertCount: group.experts.length,
        })),
        backgroundColor: alpha(color, 0.85),
        pointStyle: isCategoricalProjection ? "circle" : undefined,
        pointRadius: compact ? 4 : 8,
        pointHoverRadius: compact ? 6 : 11,
      },
      {
        label: "Collective",
        expertCollectiveRole: "collective",
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
        mode: "point",
        callbacks: {
          label: (ctx) => {
            const { datasetIndex, raw } = ctx;
            if (datasetIndex === 0) {
              const representedExperts = raw.experts || [raw];
              return representedExperts.map((expert) => {
                const name = expert.label || expert.email || expert.identity || "Expert";
                const duplicateLabel = expertPoints.filter(
                  (point) => (point.label || point.email || point.identity || "Expert") === name,
                ).length > 1;
                const stableIdentity = expert.email || expert.identity;
                const disambiguator = duplicateLabel && stableIdentity !== name
                  ? ` (${stableIdentity})`
                  : "";
                if (isCategoricalProjection) {
                  const matches = expert.details?.exactCategoryMatches;
                  const total = expert.details?.totalAlternatives;
                  const matchText = Number.isInteger(matches) && Number.isInteger(total)
                    ? ` — ${matches} of ${total} exact category matches to the collective`
                    : "";
                  return `${name}${disambiguator}${matchText} — categorical-pattern projection coordinates (${expert.x}, ${expert.y})`;
                }
                const x = Number.isFinite(expert.x) ? String(expert.x) : "—";
                const y = Number.isFinite(expert.y) ? String(expert.y) : "—";
                return `${name}${disambiguator} (${x}, ${y})`;
              });
            }
            if (isCategoricalProjection) {
              return `Collective — categorical-pattern projection coordinates (${raw.x}, ${raw.y})`;
            }
            const x = Number.isFinite(raw.x) ? String(raw.x) : "—";
            const y = Number.isFinite(raw.y) ? String(raw.y) : "—";
            return `Collective (${x}, ${y})`;
          },
        },
      },
      expertCollectiveConnectors: {
        groups: [{
          color,
          connectors,
          distanceLabel: isCategoricalProjection
            ? "Geometric distance within categorical-pattern projection"
            : "Projected distance",
        }],
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

  return (
    <Box sx={{ width: "100%", height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Scatter data={chartData} options={chartOptions} />
      </Box>
      {overlapGroups.length ? (
        <Stack spacing={0.35} sx={{ pt: 0.5 }}>
          {overlapGroups.map((group, index) => (
            <Typography key={`${group.x}-${group.y}-${index}`} variant="caption" color="text.secondary" data-testid="expert-collective-overlap-note">
              {group.message}
            </Typography>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
};
