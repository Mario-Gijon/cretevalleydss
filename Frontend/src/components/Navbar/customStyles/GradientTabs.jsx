import { styled } from '@mui/system';
import { Tabs } from '@mui/material';

// Estilo personalizado para los Tabs
export const GradientTabs = styled(Tabs)({
  '& .MuiTabs-indicator': {
    background: 'linear-gradient(95deg, #45C5C5 30%, #9AECA4 100%)', // Modo claro
    height: '4px', // Altura de la barra del indicador
  },
});
