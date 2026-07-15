import { Box, Button, Stack, Typography } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import {
  dashboardCardActionSx,
  dashboardCardBodySx,
  dashboardCardFooterSx,
  dashboardCardInnerSx,
  dashboardMetaTextSx,
  dashboardCardSx,
} from "../dashboard.styles";

export const MetaText = ({ children }) => (
  <Typography variant="caption" sx={dashboardMetaTextSx}>
    {children}
  </Typography>
);

const DashboardCardShell = ({
  title,
  icon,
  number,
  subtitle,
  accent,
  actionLabel,
  onAction,
  children,
}) => (
  <Box sx={dashboardCardSx(accent)}>
    <Stack direction="row" spacing={1.1} alignItems="flex-start">
      <Box sx={{ width: 27, height: 27, display: "grid", placeItems: "center", borderRadius: 1.2, bgcolor: "rgba(255,255,255,0.075)", color: "secondary.light", fontSize: 12, fontWeight: 950 }}>{number}</Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={0.7} alignItems="center"><Box sx={{ display: "grid", color: "secondary.light" }}>{icon}</Box><Typography variant="subtitle1" sx={{ fontWeight: 950 }}>{title}</Typography></Stack>
        {subtitle ? <Typography variant="caption" sx={{ display: "block", mt: 0.25, color: "text.secondary", fontWeight: 700 }}>{subtitle}</Typography> : null}
      </Box>
    </Stack>
    <Stack sx={dashboardCardInnerSx}>
      <Box sx={dashboardCardBodySx}>
        {children}
      </Box>

      <Box sx={dashboardCardFooterSx}>
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          endIcon={<ArrowForwardRoundedIcon />}
          onClick={onAction}
          sx={dashboardCardActionSx}
        >
          {actionLabel}
        </Button>
      </Box>
    </Stack>
  </Box>
);

export default DashboardCardShell;
