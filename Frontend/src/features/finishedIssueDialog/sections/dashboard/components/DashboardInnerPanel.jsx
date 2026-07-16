import { Box } from "@mui/material";

import { dashboardInnerPanelSx } from "../dashboard.styles";

const DashboardInnerPanel = ({ children, sx }) => (
  <Box sx={[dashboardInnerPanelSx, ...(Array.isArray(sx) ? sx : [sx])]}>
    {children}
  </Box>
);

export default DashboardInnerPanel;
