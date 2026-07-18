import { Box, Button, Stack, Typography } from "@mui/material";
import ScatterPlotRoundedIcon from "@mui/icons-material/ScatterPlotRounded";
import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded";

import { AnalyticalScatterChart } from "../../../graphs/components/AnalyticalScatterChart";
import {
  visualizationCardSx,
  visualizationChartFrameSx,
  visualizationEmptySx,
  visualizationFooterSx,
  visualizationHeaderSx,
} from "../resultsVisualizations.styles.js";

const unavailableMessage = (reason) => {
  if (reason === "insufficient_variation_for_projection") {
    return "The analytical projection is unavailable because all expert inputs are equivalent.";
  }
  if (reason === "insufficient_points_for_projection") {
    return "The analytical projection is unavailable because there are not enough expert points.";
  }
  if (reason === "projection_failed") {
    return "The stored analytical projection could not be generated.";
  }
  return "No stored expert–collective analytical projection is available for this execution.";
};

const ExpertCollectiveVisualizationCard = ({
  visualization = {},
  scatterPlotRef,
  onResetZoom,
  fullWidth = false,
}) => (
  <Box sx={visualizationCardSx({ fullWidth })}>
    <Stack sx={visualizationHeaderSx}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <ScatterPlotRoundedIcon sx={{ color: "secondary.light" }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: 18, fontWeight: 950 }}>
            Expert–collective map
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 11.5 }}>
            Dispersion of expert points and the collective position.
          </Typography>
        </Box>
      </Stack>

      {visualization.available ? (
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          startIcon={<CenterFocusStrongRoundedIcon />}
          onClick={onResetZoom}
        >
          Reset zoom
        </Button>
      ) : null}
    </Stack>

    {visualization.available ? (
      <Box sx={visualizationChartFrameSx("scatter")}>
        <AnalyticalScatterChart
          data={visualization.data}
          phase={0}
          scatterPlotRef={scatterPlotRef}
        />
      </Box>
    ) : (
      <Stack sx={visualizationEmptySx}>
        <Typography color="text.secondary" sx={{ fontSize: 12.5 }}>
          {unavailableMessage(visualization.unavailableReason)}
        </Typography>
      </Stack>
    )}

    <Typography sx={visualizationFooterSx}>
      Coordinates come from the stored analytical projection for this execution.
    </Typography>
  </Box>
);

export default ExpertCollectiveVisualizationCard;
