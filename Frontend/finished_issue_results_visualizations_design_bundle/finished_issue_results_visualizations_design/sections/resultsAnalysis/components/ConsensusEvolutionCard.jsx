import { Box, Chip, Stack, Typography } from "@mui/material";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";

import { AnalyticalConsensusLineChart } from "../../../graphs/components/AnalyticalConsensusLineChart";
import {
  visualizationCardSx,
  visualizationChartFrameSx,
  visualizationEmptySx,
  visualizationFooterSx,
  visualizationHeaderSx,
} from "../resultsVisualizations.styles.js";

const asPercentage = (value) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${Number((value * 100).toFixed(1))}%`
    : null;

const ConsensusEvolutionCard = ({ consensus = {} }) => {
  const thresholdLabel = asPercentage(consensus.threshold);

  return (
    <Box sx={visualizationCardSx({ fullWidth: false })}>
      <Stack sx={visualizationHeaderSx}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <TimelineRoundedIcon sx={{ color: "secondary.light" }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" sx={{ fontSize: 18, fontWeight: 950 }}>
              Consensus evolution
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 11.5 }}>
              Consensus level by phase.
            </Typography>
          </Box>
        </Stack>

        {thresholdLabel ? (
          <Chip
            size="small"
            color="secondary"
            variant="outlined"
            label={`Threshold ${thresholdLabel}`}
          />
        ) : null}
      </Stack>

      {consensus.available ? (
        <Box sx={visualizationChartFrameSx("consensus")}>
          <AnalyticalConsensusLineChart data={consensus.graph} />
        </Box>
      ) : (
        <Stack sx={visualizationEmptySx}>
          <Typography color="text.secondary" sx={{ fontSize: 12.5 }}>
            {consensus.unavailableReason ||
              "No stored consensus progression is available."}
          </Typography>
        </Stack>
      )}

      <Typography sx={visualizationFooterSx}>
        Consensus scores use the stored 0–1 scale for this issue.
      </Typography>
    </Box>
  );
};

export default ConsensusEvolutionCard;
