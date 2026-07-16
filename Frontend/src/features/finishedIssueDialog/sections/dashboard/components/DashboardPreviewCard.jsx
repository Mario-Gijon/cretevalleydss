import { Box, Button, Stack, Typography } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import {
  dashboardCardActionSx,
  dashboardCardBodySx,
  dashboardCardFooterSx,
  dashboardCardHeaderSx,
  dashboardCardInnerSx,
  dashboardCardNumberSx,
  dashboardCardSx,
  dashboardCardSubtitleSx,
  dashboardCardTitleSx,
} from "../dashboard.styles";

const DashboardPreviewCard = ({ number, title, subtitle, accent = "cyan", actionLabel, onAction, children }) => (
  <Box sx={dashboardCardSx(accent)}>
    <Box sx={dashboardCardHeaderSx}>
      <Box sx={dashboardCardNumberSx}>{number}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h2" sx={dashboardCardTitleSx}>{title}</Typography>
        {subtitle ? <Typography sx={dashboardCardSubtitleSx}>{subtitle}</Typography> : null}
      </Box>
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
