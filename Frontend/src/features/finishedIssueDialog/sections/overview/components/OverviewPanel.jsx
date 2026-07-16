import { Box, Typography } from "@mui/material";

import {
  overviewPanelCountSx,
  overviewPanelHeaderSx,
  overviewPanelIconSx,
  overviewPanelSx,
  overviewPanelTitleSx,
} from "../overview.styles";

const OverviewPanel = ({
  title,
  icon,
  count,
  children,
  sx,
}) => (
  <Box sx={[overviewPanelSx, ...(Array.isArray(sx) ? sx : [sx])]}>
    <Box sx={overviewPanelHeaderSx}>
      <Box sx={overviewPanelIconSx}>{icon}</Box>
      <Typography component="h2" sx={overviewPanelTitleSx}>
        {title}
      </Typography>
      {count !== undefined && count !== null ? (
        <Typography component="span" sx={overviewPanelCountSx}>
          {count}
        </Typography>
      ) : null}
    </Box>
    {children}
  </Box>
);

export default OverviewPanel;
