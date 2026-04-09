import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, GlobalStyles } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";

import { App } from "./App.jsx";
import { AuthProvider } from "./context/auth/auth.provider.jsx";
import { SnackbarAlertProvider } from "./context/snackbarAlert/snackbarAlert.provider.jsx";
import { theme } from "./theme/appTheme.js";
import { appGlobalStyles } from "./theme/globalStyles.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme} disableTransitionOnChange>
      <CssBaseline enableColorScheme />
      <GlobalStyles styles={appGlobalStyles} />

      <AuthProvider>
        <SnackbarAlertProvider>
          <App />
        </SnackbarAlertProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);