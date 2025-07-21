// Importar componentes de MUI
import { AppBar, Toolbar, IconButton, Typography } from '@mui/material';
// Importar iconos de MUI
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
// Definir el componente SettingsHeader
export default function SettingsHeader({ handleClose }) {
  return (
    // Barra de aplicación
    <AppBar elevation={5} enableColorOnDark sx={{ position: 'relative', mb: 1.8}}>
      <Toolbar>
        {/* Título de la barra de herramientas */}
        <Typography sx={{ ml: 1, flex: 1 }} variant="h5">
          Settings
        </Typography>
        {/* Botón para cerrar el diálogo */}
        <IconButton color='inherit' onClick={handleClose} aria-label="close">
          <ExpandLessIcon fontSize='large'/>
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
