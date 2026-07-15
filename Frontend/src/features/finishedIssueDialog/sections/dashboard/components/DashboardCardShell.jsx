import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import { SectionCard } from "../../../shared/components/FinishedIssueDialogPrimitives";
import {
  dashboardCardActionSx,
  dashboardCardBodySx,
  dashboardCardFooterSx,
  dashboardCardInnerSx,
  dashboardMetaTextSx,
} from "../dashboard.styles";

export const MetaText = ({ children }) => (
  <Typography variant="caption" sx={dashboardMetaTextSx}>
    {children}
  </Typography>
);

const DashboardCardShell = ({
  title,
  icon,
  actionLabel,
  onAction,
  children,
}) => (
  <SectionCard
    title={title}
    icon={icon}
    sx={{
      height: "100%",
    }}
  >
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
  </SectionCard>
);

export default DashboardCardShell;