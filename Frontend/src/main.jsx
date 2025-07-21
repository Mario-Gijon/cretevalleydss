// Importa de React
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Importaciones de estilos globales
/* import '@fontsource/Source Sans Pro/300.css';
import '@fontsource/Source Sans Pro/400.css';
import '@fontsource/Source Sans Pro/500.css';
import '@fontsource/Source Sans Pro/700.css'; */
/* import '@fontsource/inter'; */

// Importaciones de Material UI
import { CssBaseline, GlobalStyles } from "@mui/material";
import { ThemeProvider, extendTheme, responsiveFontSizes } from '@mui/material/styles';

// Importaciones de la aplicación
import { AuthProvider } from "./context/auth/auth.provider.jsx";
import { App } from './App.jsx';
import { SnackbarAlertProvider } from './context/snackbarAlert/snackbar.provider.jsx';

// Configuración del tema de Material UI
let theme = extendTheme({
  typography: {
    fontFamily: 'Source Sans Pro, Arial, sans-serif', // Fuente principal
    h1: {
      fontFamily: 'Source Sans Pro, Arial, sans-serif', // Fuente para h1
      fontWeight: 'bold', // Negrita para títulos
    },
    h2: {
      fontFamily: 'Source Sans Pro, Arial, sans-serif', // Fuente para h2
      fontWeight: 'bold', // Negrita para subtítulos
    },
    h3: {
      fontFamily: 'Source Sans Pro, Arial, sans-serif', // Fuente para h3
      fontWeight: 'bold', // Negrita para subtítulos
    },
    h4: {
      fontFamily: 'Source Sans Pro, Arial, sans-serif', // Fuente para h4
      fontWeight: 'bold', // Negrita para subtítulos
    },
    body1: {
      fontFamily: 'Source Sans Pro, Arial, sans-serif', // Fuente para el cuerpo del texto
      fontWeight: 'normal', // Peso normal para el texto
    },
    body2: {
      fontFamily: 'Source Sans Pro, Arial, sans-serif', // Fuente para texto secundario
      fontWeight: 'normal', // Peso normal para el texto
    },
    button: {
      fontFamily: 'Source Sans Pro, Arial, sans-serif', // Fuente para botones
      fontWeight: 'bold', // Negrita para botones
    },
    caption: {
      fontFamily: 'Source Sans Pro, Arial, sans-serif', // Fuente para texto pequeño (caption)
      fontWeight: 'normal', // Peso normal para texto pequeño
    },
    overline: {
      fontFamily: 'Source Sans Pro, Arial, sans-serif', // Fuente para texto overline
      fontWeight: 'normal', // Peso normal para texto overline
    },
  },
  colorSchemes: {
    light: {
      palette: {
        mode: 'light', // Modo claro
        primary: {
          main: '#134F8A', // Azul claro (primary en modo oscuro)
          light: '#134F8A', // Azul claro (variante más clara de primary)
        },
        secondary: {
          main: '#45C5C5', // Turquesa (secondary)
          contrastText: '#fff', // Rojo (error) - No está en el PDF, pero es necesario
        },
        background: {
          default: '#F5F0F6', // Gris claro (fondo predeterminado)
          paper: '#FFFFFF', // Blanco (fondo de componentes como cards)
        },
        text: {
          primary: '#1D1D1B', // Negro (texto principal)
          secondary: '#545454', // Gris claro (fondo predeterminado)
          disabled: '#134F8A', // Azul claro (texto deshabilitado)
        },
        success: {
          main: "#1bd230", // Verde claro (éxito)
          contrastText: '#fff', // Rojo (error) - No está en el PDF, pero es necesario
        },
        warning: {
          main: '#abce11', // Amarillo verdoso (advertencia)
          contrastText: '#fff', // Rojo (error) - No está en el PDF, pero es necesario
        },
        error: {
          main: '#f44336', // Rojo (error) - No está en el PDF, pero es necesario
          light: '#e57373', // Rojo (error) - No está en el PDF, pero es necesario
          dark: '#D32f2f', // Rojo (error) - No está en el PDF, pero es necesario
          contrastText: '#fff', // Rojo (error) - No está en el PDF, pero es necesario
        },
        info: {
          main: '#45C5C5', // Turquesa (info, puede ser igual que secondary)
          contrastText: '#fff', // Rojo (error) - No está en el PDF, pero es necesario
        },
      },
    },
    /* light: {
      palette: {
        mode: 'dark', // Modo oscuro
        primary: {
          main: '#224261', // Azul intermedio (primary)
          light: '#45C5C5', // Turquesa (variante más clara de primary)
        },
        secondary: {
          main: '#45C5C5', // Turquesa (texto secundario en modo oscuro)
        },
        background: {
          default: '#1D1D1B', // Negro (fondo predeterminado en modo oscuro)
          paper: '#262B32', // Azul grisaceo (fondo de componentes como cards)
        },
        text: {
          primary: '#FFFFFF', // Blanco (texto principal en modo oscuro)
          secondary: '#BFBFBF', // Gris claro (fondo predeterminado)
          disabled: '#9AECA4', // Verde claro (texto deshabilitado en modo oscuro)
          info: '#45C5C5', // Turquesa (info, puede ser igual que secondary)
        },
        success: {
          main: '#68e377', // Verde claro (éxito)
        },

        warning: {
          main: '#C2E812', // Amarillo verdoso (advertencia)
        },
        error: {
          main: '#f44336', // Rojo (error) - No está en el PDF, pero es necesario
          light: '#e57373', // Rojo (error) - No está en el PDF, pero es necesario
          dark: '#D32f2f', // Rojo (error) - No está en el PDF, pero es necesario
        },
        info: {
          main: '#45C5C5', // Turquesa (info, puede ser igual que secondary)
        },
      },
    }, */
    dark: {
      palette: {
        mode: 'dark', // Modo oscuro
        primary: {
          main: '#224261', // Azul intermedio (primary)
          light: '#45C5C5', // Turquesa (variante más clara de primary)
        },
        secondary: {
          main: '#45C5C5', // Turquesa (texto secundario en modo oscuro)
        },
        background: {
          default: '#1D1D1B', // Negro (fondo predeterminado en modo oscuro)
          paper: '#262B32', // Azul grisaceo (fondo de componentes como cards)
        },
        text: {
          primary: '#FFFFFF', // Blanco (texto principal en modo oscuro)
          secondary: '#BFBFBF', // Gris claro (fondo predeterminado)
          disabled: '#9AECA4', // Verde claro (texto deshabilitado en modo oscuro)
          info: '#45C5C5', // Turquesa (info, puede ser igual que secondary)
        },
        success: {
          main: '#68e377', // Verde claro (éxito)
        },

        warning: {
          main: '#C2E812', // Amarillo verdoso (advertencia)
        },
        error: {
          main: '#f44336', // Rojo (error) - No está en el PDF, pero es necesario
          light: '#e57373', // Rojo (error) - No está en el PDF, pero es necesario
          dark: '#D32f2f', // Rojo (error) - No está en el PDF, pero es necesario
        },
        info: {
          main: '#45C5C5', // Turquesa (info, puede ser igual que secondary)
        },
      },
    },
  },
  colorSchemeSelector: 'class',
});

// Ajuste de fuentes responsivas
theme = responsiveFontSizes(theme);

// Renderizado de la aplicación
createRoot(document.getElementById('root')).render(
  // Modo estricto de React
  <StrictMode>
    {/* Proveedor de tema de Material UI */}
    <ThemeProvider theme={theme} disableTransitionOnChange>
      {/* Restablecimiento de estilos globales */}
      <CssBaseline enableColorScheme />
      {/* Estilos globales personalizados */}
      <GlobalStyles
        styles={{
          body: {
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: 'linear-gradient(95deg, #45C5C5 0%, #70D9B5 60%, #9AECA4 100%)',
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: 'linear-gradient(95deg, #3d909e 0%, #5a9e8a 60%, #7a9e4a 100%)',
            },
          },
          ".MuiTableContainer-root, .MuiStack-root": {
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "4px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: '#1D1D1B',
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: 'linear-gradient(95deg, #3d909e 0%, #5a9e8a 60%, #7a9e4a 100%)',
            },
          }
        }}
      />
      {/* Proveedor de autenticación */}
      <AuthProvider>
        <SnackbarAlertProvider>
          {/* Componente principal de la aplicación */}
          <App />
        </SnackbarAlertProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
