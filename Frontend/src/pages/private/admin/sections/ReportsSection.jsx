// private/admin/sections/ReportsSection.jsx
import { Paper, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

export default function ReportsSection() {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 4,
        p: 2,
        bgcolor: alpha(theme.palette.background.paper, 0.08),
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No content to display.
      </Typography>
    </Paper>
  );
}