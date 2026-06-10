import { Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { getAdminIssueDetailCardSx } from "../../issues/styles/adminIssues.styles";

export default function MetricCard({ label, value, helper, severity = "info" }) {
  const theme = useTheme();
  const color = theme.palette[severity]?.main || theme.palette.info.main;

  return (
    <Paper elevation={0} sx={{ ...getAdminIssueDetailCardSx(theme), p: 1.15 }}>
      <Stack spacing={0.35}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 980, lineHeight: 1 }}>
          {value}
        </Typography>
        {helper && (
          <Typography
            variant="caption"
            sx={{ color: alpha(color, 0.92), fontWeight: 900 }}
          >
            {helper}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
