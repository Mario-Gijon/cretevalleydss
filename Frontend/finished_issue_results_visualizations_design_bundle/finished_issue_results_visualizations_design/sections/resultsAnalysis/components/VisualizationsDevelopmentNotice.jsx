import { Box, Stack, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";

import { visualizationsNoticeSx } from "../resultsVisualizations.styles.js";

const VisualizationsDevelopmentNotice = ({ consensusEnabled }) => (
  <Box sx={visualizationsNoticeSx}>
    <Stack direction="row" spacing={1.2} alignItems="center">
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          border: "1px solid rgba(39,213,228,0.35)",
          bgcolor: "rgba(39,213,228,0.08)",
          color: "secondary.light",
          flex: "0 0 auto",
        }}
      >
        <InfoOutlinedIcon />
      </Box>

      <Box>
        <Typography sx={{ fontSize: 14.5, fontWeight: 950 }}>
          Visualization coverage is currently limited.
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: 11.5 }}>
          {consensusEnabled
            ? "This version includes the expert–collective map and consensus evolution. Additional analytical visualizations will be added in future iterations."
            : "This version includes the expert–collective map. Additional analytical visualizations will be added in future iterations."}
        </Typography>
      </Box>
    </Stack>

    <QueryStatsRoundedIcon
      sx={{
        ml: "auto",
        display: { xs: "none", sm: "block" },
        fontSize: 58,
        color: "rgba(39,213,228,0.30)",
      }}
    />
  </Box>
);

export default VisualizationsDevelopmentNotice;
