import { Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export default function EmptyState({ children = "No review items detected." }) {
  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        borderRadius: 3,
        p: 1.4,
        bgcolor: alpha(theme.palette.common.white, 0.035),
        border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
      })}
    >
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        {children}
      </Typography>
    </Paper>
  );
}
