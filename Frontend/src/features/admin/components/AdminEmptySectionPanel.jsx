import { Paper, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

/**
 * Panel vacio reutilizable para secciones de admin sin contenido.
 *
 * @param {object} props
 * @param {string} [props.message]
 * @returns {JSX.Element}
 */
const AdminEmptySectionPanel = ({ message = "No content to display." }) => {
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
        {message}
      </Typography>
    </Paper>
  );
};

export default AdminEmptySectionPanel;
