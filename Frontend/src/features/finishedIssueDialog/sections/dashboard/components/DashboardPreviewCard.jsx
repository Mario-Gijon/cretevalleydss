import { Box, Button, Stack, Typography } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import {
  dashboardCardActionSx,
  dashboardCardBodySx,
  dashboardCardFooterSx,
  dashboardCardHeaderSx,
  dashboardCardIconSx,
  dashboardCardInnerSx,
  dashboardCardSx,
  dashboardCardTitleSx,
} from "../dashboard.styles";

const DashboardPreviewCard = ({ icon, title, headerRight = null, actionLabel, onAction, children }) => (
  <Box sx={dashboardCardSx()}>
    <Box sx={dashboardCardHeaderSx}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.05, minWidth: 0, flex: 1 }}>
        <Box data-testid="summary-card-icon" sx={dashboardCardIconSx}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={dashboardCardTitleSx}>{title}</Typography>
        </Box>
      </Box>
      {headerRight ? <Box sx={{ flexShrink: 0, pl: 0.75 }}>{headerRight}</Box> : null}
    </Box>
    <Stack sx={dashboardCardInnerSx}>
      <Box sx={dashboardCardBodySx}>{children}</Box>
      <Box sx={dashboardCardFooterSx}>
        <Button variant="outlined" color="secondary" endIcon={<ArrowForwardRoundedIcon />} onClick={onAction} sx={dashboardCardActionSx}>{actionLabel}</Button>
      </Box>
    </Stack>
  </Box>
);

export default DashboardPreviewCard;
