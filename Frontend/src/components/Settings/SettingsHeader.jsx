// Importar componentes de MUI
import { IconButton, Typography, Stack } from '@mui/material';
// Importar iconos de MUI
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
// Definir el componente SettingsHeader
export default function SettingsHeader({ handleClose }) {
  return (
    // Barra de aplicación
    <Stack direction={"row"} justifyContent={"space-between"} p={2} alignItems={"center"} pb={1} pt={1}>
      {/* Título de la barra de herramientas */}
      <Typography sx={{ ml: 1, flex: 1 }} variant="h5">
        Settings
      </Typography>
      {/* Botón para cerrar el diálogo */}
      <IconButton color='inherit' onClick={handleClose} aria-label="close">
        <ExpandLessIcon fontSize='large' />
      </IconButton>
    </Stack>

  );
}
