import { Box, Stack, Typography } from "@mui/material";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";

import { comparisonVisualizationsPlaceholderSx } from "../resultsVisualizations.styles.js";

const ComparisonVisualizationsPlaceholder = () => (
  <Stack sx={comparisonVisualizationsPlaceholderSx}>
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        border: "1px solid rgba(39,213,228,0.28)",
        bgcolor: "rgba(39,213,228,0.07)",
        color: "secondary.light",
      }}
    >
      <CompareArrowsRoundedIcon />
    </Box>
    <Typography sx={{ fontSize: 17, fontWeight: 950 }}>
      Comparative visualizations
    </Typography>
    <Typography
      color="text.secondary"
      sx={{ maxWidth: 560, textAlign: "center", fontSize: 12.5 }}
    >
      Comparative visualizations are not available yet. Select one execution to
      view its stored analytical visualizations.
    </Typography>
  </Stack>
);

export default ComparisonVisualizationsPlaceholder;
