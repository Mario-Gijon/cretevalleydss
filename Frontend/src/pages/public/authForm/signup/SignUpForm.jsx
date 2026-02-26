// Importación de componentes de Material UI
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
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { alpha, useTheme } from "@mui/material/styles";

import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";

/* import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode"; */

// Importación de hooks de React y otras bibliotecas
import { useState } from "react";

// Utilidad para validar el formulario
import { validateForm } from "./utils/validationUtils";

// Utilidades para manejar valores y errores del formulario
import { initialFormValues, initialErrors, handleFormChange } from "./utils/formUtils";

// Función para realizar el registro
import { signup } from "../../../../controllers/authController";
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

// Componente SignUpForm
const SignUpForm = () => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { navigate /* toggleTheme */ } = useOutletContext();
  /* const { mode } = useColorScheme() */

  // Estado para mostrar u ocultar la contraseña
  const [showPassword, setShowPassword] = useState(false);
  // Estado para mostrar u ocultar la confirmación de contraseña
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  // Estado para los valores del formulario
  const [formValues, setFormValues] = useState(initialFormValues);
  // Estado para los errores de validación del formulario
  const [errors, setErrors] = useState(initialErrors);
  // Estado para el indicador de carga
  const [loading, setLoading] = useState(false);

  // Función para manejar la visibilidad de las contraseñas
  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleClickShowRepeatPassword = () => setShowRepeatPassword(!showRepeatPassword);

  // Función para manejar cambios en los campos del formulario
  const handleChange = (e) => handleFormChange(e, setFormValues, formValues);

  // Función para reiniciar los valores del formulario y los errores
  const handleRestart = () => {
    setFormValues(initialFormValues);
    setErrors(initialErrors);
  };

  // Función para manejar el envío del formulario
  const handleSignUp = async (e) => {
    e.preventDefault();

    const newErrors = validateForm(formValues);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        setLoading(true);

        const data = await signup(formValues);

        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors(initialErrors);
          showSnackbarAlert("Signup successfully, check your email for confirmation", "success");
          navigate("/login");
        }
      } catch (error) {
        console.error("Error submitting the form:", error);
        showSnackbarAlert("An error occurred while submitting the form", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  // Función para manejar el evento de presionar "Enter" en los campos de entrada
  const handleKeyDown = (e, nextFieldId) => {
    if (e.key === "Enter") {
      const nextField = document.getElementById(nextFieldId);
      if (nextField) nextField.focus();
    }
  };

  // Función para manejar el evento de presionar "Enter" en el último campo (Enviar formulario)
  const handleKeyDownSubmit = (e) => {
    if (e.key === "Enter") {
      handleSignUp(e);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ display: "flex", justifyContent: "center" }}>
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
                bgcolor: alpha(theme.palette.info.main, 0.12),
                color: "info.main",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <PersonAddAltRoundedIcon />
            </Avatar>

            <Stack spacing={0.2} sx={{ minWidth: 0 }}>
              <Typography variant="h4" sx={{ fontWeight: 980, lineHeight: 1.05 }}>
                Sign Up
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                Create your account
              </Typography>
            </Stack>
          </Stack>

          {/* Form */}
          <Box component="form" onSubmit={handleSignUp} pt={2}>
            <Stack spacing={1.4}>
              {/* Fila para nombre y universidad */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.4} sx={{ width: "100%" }}>
                <TextField
                  id="name"
                  name="name"
                  label="Name"
                  value={formValues.name}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, "email")}
                  autoComplete="off"
                  error={!!errors.name}
                  helperText={errors.name || " "}
                  size="small"
                  fullWidth
                  color="secondary"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  id="university"
                  name="university"
                  label="University"
                  value={formValues.university}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, "name")}
                  autoComplete="off"
                  error={!!errors.university}
                  helperText={errors.university || " "}
                  size="small"
                  fullWidth
                  color="secondary"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SchoolRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>

              {/* Campo de correo electrónico */}
              <TextField
                id="email"
                name="email"
                type="email"
                label="Email"
                value={formValues.email}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, "password")}
                autoComplete="off"
                error={!!errors.email}
                helperText={errors.email || " "}
                size="small"
                fullWidth
                color="secondary"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Campo de contraseña */}
              <TextField
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                label="Password"
                value={formValues.password}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, "repeatPassword")}
                autoComplete="off"
                error={!!errors.password}
                helperText={errors.password || "1 number, 1 letter, min 6"}
                size="small"
                fullWidth
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

              {/* Campo de confirmación de contraseña */}
              <TextField
                id="repeatPassword"
                name="repeatPassword"
                type={showRepeatPassword ? "text" : "password"}
                label="Repeat Password"
                value={formValues.repeatPassword}
                onChange={handleChange}
                onKeyDown={handleKeyDownSubmit}
                autoComplete="off"
                error={!!errors.repeatPassword}
                helperText={errors.repeatPassword || " "}
                size="small"
                fullWidth
                color="secondary"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleClickShowRepeatPassword} edge="end">
                        {showRepeatPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Botones */}
              <Stack spacing={1.2} sx={{ mt: 0.5 }}>
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
                      boxShadow: `0 14px 40px ${alpha(theme.palette.secondary.main, 0.20)}`,
                    }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : "Sign Up"}
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

                <Stack direction="row" sx={{ justifyContent: "center" }}>
                  <Link
                    underline="hover"
                    color="secondary"
                    sx={{ textAlign: "center", cursor: "pointer", fontWeight: 850 }}
                    onClick={() => navigate("/login")}
                  >
                    Already registered? Click here to continue
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

export default SignUpForm;