import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { Stack, Typography } from "@mui/material";

export default function EmptyState({ icon = <InboxOutlinedIcon />, title, description, action = null, sx }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={0.75} role="status" sx={{ px: 2, py: { xs: 3, sm: 5 }, textAlign: "center", ...sx }}>
      <Stack sx={{ color: "secondary.main", mb: 0.5 }} aria-hidden="true">{icon}</Stack>
      <Typography variant="h6" sx={{ fontWeight: 850 }}>{title}</Typography>
      {description ? <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 520 }}>{description}</Typography> : null}
      {action ? <Stack sx={{ pt: 0.75 }}>{action}</Stack> : null}
    </Stack>
  );
}
