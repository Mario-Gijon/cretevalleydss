import { Box, Button, Stack, Typography } from "@mui/material";

import { SectionCard } from "../../../shared/components/FinishedIssueDialogPrimitives";
import { overviewActionSx, overviewCardContentSx } from "../overview.styles";

export const MetaText = ({ children }) => (
  <Typography variant="caption" color="text.secondary">
    {children}
  </Typography>
);

const OverviewCardShell = ({ title, icon, actionLabel, onAction, children }) => (
  <SectionCard title={title} icon={icon} sx={{ height: "100%" }}>
    <Stack spacing={1} sx={overviewCardContentSx}>
      <Box>{children}</Box>
      <Box sx={{ mt: "auto", pt: 1 }}>
        <Button variant="outlined" color="secondary" size="small" onClick={onAction} sx={overviewActionSx}>
          {actionLabel}
        </Button>
      </Box>
    </Stack>
  </SectionCard>
);

export default OverviewCardShell;
