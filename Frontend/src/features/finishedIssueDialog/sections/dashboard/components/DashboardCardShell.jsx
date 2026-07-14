import { Box, Button, Stack, Typography } from "@mui/material";

import { SectionCard } from "../../../shared/components/FinishedIssueDialogPrimitives";
import { dashboardActionSx, dashboardCardContentSx } from "../dashboard.styles";

export const MetaText = ({ children }) => (
  <Typography variant="caption" color="text.secondary">
    {children}
  </Typography>
);

const DashboardCardShell = ({ title, icon, actionLabel, onAction, children }) => (
  <SectionCard title={title} icon={icon} sx={{ height: "100%" }}>
    <Stack spacing={1} sx={dashboardCardContentSx}>
      <Box>{children}</Box>
      <Box sx={{ mt: "auto", pt: 1 }}>
        <Button variant="outlined" color="secondary" size="small" onClick={onAction} sx={dashboardActionSx}>
          {actionLabel}
        </Button>
      </Box>
    </Stack>
  </SectionCard>
);

export default DashboardCardShell;
