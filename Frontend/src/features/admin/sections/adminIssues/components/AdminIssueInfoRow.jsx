import { Stack, Typography } from "@mui/material";

/**
 * Fila informativa clave-valor para paneles de detalle.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {*} props.value
 * @returns {JSX.Element}
 */
const AdminIssueInfoRow = ({ label, value }) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={0.8}
    alignItems={{ xs: "flex-start", sm: "baseline" }}
  >
    <Typography
      variant="body2"
      sx={{ fontWeight: 950, color: "text.secondary", minWidth: 150 }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{ fontWeight: 850, wordBreak: "break-word" }}
    >
      {value ?? "—"}
    </Typography>
  </Stack>
);

export default AdminIssueInfoRow;
