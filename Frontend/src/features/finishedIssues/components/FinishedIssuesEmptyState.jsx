import { Stack, Typography } from "@mui/material";

/**
 * Estado vacío para la pantalla de issues finalizados.
 *
 * @returns {JSX.Element}
 */
const FinishedIssuesEmptyState = () => {
  return (
    <Stack sx={{ mt: 6 }} spacing={1} alignItems="center">
      <Typography variant="h4" sx={{ textAlign: "center", fontWeight: 950 }}>
        No finished issues
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: "text.secondary", textAlign: "center", maxWidth: 520 }}
      >
        When an issue is resolved, it will appear here.
      </Typography>
    </Stack>
  );
};

export default FinishedIssuesEmptyState;
