// Importa componentes de Material UI.
import {
  Typography,
  Container,
  CircularProgress,
  Button,
  Stack,
  Link,
  Divider,
  Box,
  InputAdornment,
  IconButton,
  TextField,
  Avatar,
  Paper,
} from "@mui/material";
// Importa iconos de Material UI.
import { Visibility, VisibilityOff } from "@mui/icons-material";

import { alpha, useTheme } from "@mui/material/styles";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";

// Importa hooks de React y otras bibliotecas.
import { useState, useEffect } from "react";

// Importa el uso de cookies.
import Cookies from "js-cookie";

// Utilidades para manejar valores y errores del formulario.
import { validateForm } from "./utils/validationUtils";
import { initialFormValues, initialErrors, handleFormChange } from "./utils/formUtils";

// Importa la función de inicio de sesión.
import { login } from "../../../../controllers/authController";

// Importa el contexto de autenticación.
import { useAuthContext } from "../../../../context/auth/auth.context";
import { useOutletContext } from "react-router-dom";
import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";

/* -----------------------------
 * Helpers (aurora + glass)
 * ----------------------------- */
const auroraBg = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1200px 220px at 12% 0%, ${alpha(theme.palette.info.main, intensity)}, transparent 62%),
                    radial-gradient(900px 160px at 8% 6%, ${alpha(theme.palette.secondary.main, intensity)}, transparent 58%)`,
});

const glassSx = (theme, strength = 0.14) => ({
  backgroundColor: alpha(theme.palette.background.paper, strength),
  backdropFilter: "blur(14px)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.10)}`,
  border: "1px solid rgba(155, 192, 197, 0.45)",
});

// Componente LogInForm.
const LogInForm = () => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const { navigate /* toggleTheme */ } = useOutletContext();
  /* const { mode } = useColorScheme() */

  // Estado para mostrar u ocultar la contraseña.
  const [showPassword, setShowPassword] = useState(false);

  // Estado para indicar si se está cargando.
  const [loading, setLoading] = useState(false);

  // Extrae la función setIsLoggedIn del contexto de autenticación.
  const { setIsLoggedIn } = useAuthContext();

  // Estado para almacenar los valores del formulario.
  const [formValues, setFormValues] = useState(initialFormValues);

  // Estado para almacenar los errores de validación.
  const [errors, setErrors] = useState(initialErrors);

  // Función para alternar el estado de mostrar u ocultar la contraseña.
  const handleClickShowPassword = () => setShowPassword(!showPassword);

  // Función para manejar los cambios en los campos del formulario.
  const handleChange = (e) => handleFormChange(e, setFormValues, formValues);

  // Función para reiniciar el formulario y los errores.
  const handleRestart = () => {
    setFormValues(initialFormValues);
    setErrors(initialErrors);
  };

  // Función para manejar el envío del formulario.
  const handleLogin = async (e) => {
    e.preventDefault();

    const newErrors = validateForm(formValues);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        setLoading(true);

        const data = await login(formValues);

        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors(initialErrors);
          showSnackbarAlert("Logged in successfully!", "success");
          setIsLoggedIn(true);
          location.reload();
        }
      } catch (error) {
        console.error("Error submitting the form:", error);
        showSnackbarAlert("An error occurred while submitting the form", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  // Maneja el evento de presionar Enter en el campo "Email".
  const handleKeyDownEmail = (e) => {
    if (e.key === "Enter") {
      document.getElementById("password")?.focus();
    }
  };

  // Maneja el evento de presionar Enter en el campo "Password".
  const handleKeyDownPassword = (e) => {
    if (e.key === "Enter") {
      handleLogin(e);
    }
  };

  // Efecto para verificar el estado de la cuenta a partir de la cookie.
  useEffect(() => {
    const accountStatus = Cookies.get("accountStatus");

    if (accountStatus) {
      if (accountStatus === "verified") {
        showSnackbarAlert("Account verified successfully!", "success");
      } else if (accountStatus === "verification_failed") {
        showSnackbarAlert("Invalid account verification", "error");
      } else if (accountStatus === "error") {
        showSnackbarAlert("An error occurred during account verification.", "error");
      }

      Cookies.remove("accountStatus");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container maxWidth="xs" sx={{ display: "flex", justifyContent: "center" }}>
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          borderRadius: 6,
          overflow: "hidden",
          position: "relative",
          ...glassSx(theme, 0.16),
          ...auroraBg(theme, 0.16),
          "&:after": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 48%)`,
            opacity: 0.22,
          },
        }}
      >
        <Box sx={{ position: "relative", zIndex: 1, p: { xs: 2, sm: 2.5 } }}>
          {/* Header */}
          <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", mb: 2 }}>
            <Avatar
              sx={{
                width: 46,
                height: 46,
                bgcolor: alpha(theme.palette.secondary.main, 0.12),
                color: "secondary.main",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <LockRoundedIcon />
            </Avatar>

            <Stack spacing={0.2} sx={{ minWidth: 0 }}>
              <Typography variant="h4" sx={{ fontWeight: 980, lineHeight: 1.05 }}>
                Log In
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                Access your workspace
              </Typography>
            </Stack>
          </Stack>

          {/* Form */}
          <Box component="form" onSubmit={handleLogin} sx={{ pt: 2 }}>
            <Stack spacing={0}>
              <Stack spacing={0.2}>
                <TextField
                  id="email"
                  name="email"
                  type="email"
                  label="Email"
                  value={formValues.email}
                  onChange={handleChange}
                  onKeyDown={handleKeyDownEmail}
                  error={!!errors.email}
                  helperText={errors.email || " "}
                  fullWidth
                  size="small"
                  color="secondary"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  value={formValues.password}
                  onChange={handleChange}
                  onKeyDown={handleKeyDownPassword}
                  autoComplete="off"
                  error={!!errors.password}
                  helperText={errors.password || " "}
                  fullWidth
                  size="small"
                  color="secondary"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <KeyRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={handleClickShowPassword} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

              </Stack>


              {/* Actions */}
              <Stack spnearg={1.2}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="secondary"
                    disabled={loading}
                    fullWidth
                    sx={{
                      borderRadius: 3,
                      py: 1.05,
                      fontWeight: 950,
                    }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : "Log in"}
                  </Button>

                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={handleRestart}
                    disabled={loading}
                    sx={{ borderRadius: 3, py: 1.05, minWidth: 56 }}
                    title="Restart"
                  >
                    <RestartAltRoundedIcon fontSize="small" />
                  </Button>
                </Stack>

                <Divider sx={{ opacity: 0.18 }} />

                <Stack direction="row" sx={{ justifyContent: "center", pt: 2 }}>
                  <Link
                    underline="hover"
                    color="secondary"
                    sx={{ textAlign: "center", cursor: "pointer", fontWeight: 850 }}
                    onClick={() => navigate("/signup")}
                  >
                    Not registered? Click here to continue
                  </Link>
                </Stack>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default LogInForm;