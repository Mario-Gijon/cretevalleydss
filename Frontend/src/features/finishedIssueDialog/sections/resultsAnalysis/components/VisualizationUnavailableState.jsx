import { Box, Stack, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const VisualizationUnavailableState = ({
  minHeight = 180,
  title = "Visualization not applicable for this execution",
  description = "This execution does not expose the specific data required for this chart.",
  detail = "The result is still valid; this view simply does not apply to the selected model.",
}) => (
  <Box
    data-testid="visualization-unavailable-state"
    sx={{
      minHeight,
      display: "grid",
      placeItems: "center",
      px: 2,
      py: 2,
      textAlign: "center",
    }}
  >
    <Stack spacing={0.8} alignItems="center" sx={{ maxWidth: 430 }}>
      <InfoOutlinedIcon sx={{ color: "secondary.light", fontSize: 28 }} />
      <Typography component="p" variant="subtitle2" sx={{ fontWeight: 900 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {detail}
      </Typography>
    </Stack>
  </Box>
);

export default VisualizationUnavailableState;
