// Importa componentes de Material UI.
import { Card, CardContent, Typography, Container, CircularProgress, FormHelperText, Button, Stack, Link, Divider, Box, InputAdornment, IconButton, Input, InputLabel, FormControl, /* useColorScheme */ } from '@mui/material';
// Importa iconos de Material UI.
import { Visibility, VisibilityOff } from '@mui/icons-material';
/* import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode"; */

// Importa hooks de React y otras bibliotecas.
import { useState, useEffect } from 'react';

// Importa el uso de cookies.
import Cookies from "js-cookie";

// Utilidades para manejar valores y errores del formulario.
import { validateForm } from './utils/validationUtils';
import { initialFormValues, initialErrors, handleFormChange } from './utils/formUtils';

// Importa la función de inicio de sesión.
import { login } from '../../../src/controllers/authController';

// Importa el contexto de autenticación.
import { useAuthContext } from '../../../src/context/auth/auth.context';
import { useOutletContext } from 'react-router-dom';
import { useSnackbarAlertContext } from '../../../src/context/snackbarAlert/snackbarAlert.context';

// Componente LogInForm.
const LogInForm = () => {

  const { showSnackbarAlert } = useSnackbarAlertContext()

  const { navigate, /* toggleTheme */ } = useOutletContext()
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
    // Reinicia los valores del formulario.
    setFormValues(initialFormValues);
    // Reinicia los errores.
    setErrors(initialErrors);
  };

  // Función para manejar el envío del formulario.
  const handleLogin = async (e) => {
    // Evita el comportamiento predeterminado del formulario.
    e.preventDefault();

    // Validación en el frontend.
    const newErrors = validateForm(formValues);
    // Actualiza los errores.
    setErrors(newErrors);

    // Si no hay errores.
    if (Object.keys(newErrors).length === 0) {
      try {
        // Establece el estado de carga en verdadero.
        setLoading(true);

        // Realiza la solicitud de inicio de sesión.
        const data = await login(formValues);

        // Si hay errores en la respuesta, actualiza los errores.
        if (data.errors) {
          setErrors(data.errors);
        } else {
          // Reinicia los errores.
          setErrors(initialErrors);
          showSnackbarAlert("Logged in successfully!", "success");
          // Establece el estado de autenticación en verdadero.
          setIsLoggedIn(true);
          location.reload();
        }
      } catch (error) {
        // Maneja cualquier error en la solicitud.
        console.error('Error submitting the form:', error);
        // Muestra un mensaje de error si ocurre una excepción.
        showSnackbarAlert('An error occurred while submitting the form', 'error');
      } finally {
        // Establece el estado de carga en falso.
        setLoading(false);
      }
    }
  };

  // Maneja el evento de presionar Enter en el campo "userName".
  const handleKeyDownEmail = (e) => {
    if (e.key === 'Enter') {
      // Mueve el foco al campo de contraseña.
      document.getElementById('password').focus();
    }
  };

  // Maneja el evento de presionar Enter en el campo "Password".
  const handleKeyDownPassword = (e) => {
    if (e.key === 'Enter') {
      // Envía el formulario si se presiona Enter.
      handleLogin(e);
    }
  };

  // Efecto para verificar el estado de la cuenta a partir de la cookie.
  useEffect(() => {
    // Verifica el estado de la cuenta a partir de la cookie.
    const accountStatus = Cookies.get("accountStatus");

    if (accountStatus) {
      // Muestra un mensaje dependiendo del estado de la cuenta.
      if (accountStatus === "verified") {
        showSnackbarAlert("Account verified successfully!", "success");
      } else if (accountStatus === "verification_failed") {
        showSnackbarAlert("Invalid account verification", "error");
      } else if (accountStatus === "error") {
        showSnackbarAlert("An error occurred during account verification.", "error");
      }

      // Elimina la cookie después de leerla.
      Cookies.remove("accountStatus");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo se ejecuta cuando showSnackbar cambia.

  return (
    <>
      {/* Botón para cambiar el tema */}
      <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        {/* <IconButton onClick={toggleTheme}>
          {mode === "dark" ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton> */}
      </Box>
      <Container maxWidth="xs" flexDirection="column" justifyContent="center" alignItems="center">
        <Card raised sx={{ padding: '5px' }}>
          <CardContent sx={{ width: "100%" }}>
            <Stack direction="column" spacing={3} sx={{ padding: '15px', paddingX: '20px' }}>
              <Typography variant="h2" sx={{ fontWeight: 'bold', paddingBottom: '10px' }}>Log In</Typography>

              {/* Campo de correo electrónico */}
              <FormControl variant="standard" color="secondary" error={!!errors.email}>
                <InputLabel htmlFor="email">Email</InputLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formValues.email}
                  onChange={handleChange}
                  onKeyDown={handleKeyDownEmail}  // Mueve el foco al campo password
                  /* autoComplete="off" */
                />
                {errors.email && <FormHelperText>{errors.email}</FormHelperText>}  {/* Muestra el error si existe */}
              </FormControl>

              {/* Campo de contraseña */}
              <FormControl variant="standard" color='secondary' error={!!errors.password}>
                <InputLabel htmlFor="password">Password</InputLabel>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formValues.password}
                  onChange={handleChange}
                  onKeyDown={handleKeyDownPassword} // Evento de tecla presionada.
                  autoComplete="off"
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton onClick={handleClickShowPassword}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                />
                <FormHelperText>
                  {errors.password && <FormHelperText>{errors.password}</FormHelperText>}
                </FormHelperText>
              </FormControl>

              {/* Botones de acción */}
              <Box>
                <Stack direction={"row"} spacing={2} sx={{ justifyContent: "center", alignItems: "center", pb: 4 }}>
                  <Button variant="contained" color='secondary' disabled={loading} onClick={handleLogin}>
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Log in"}
                  </Button>
                  <Divider orientation="vertical" flexItem />
                  <Button variant="outlined" color='inherit' onClick={handleRestart}>Restart</Button>
                </Stack>
                <Stack direction={"column"} spacing={2} sx={{ justifyContent: "center", alignItems: "center" }}>
                  <Link underline="hover" color='secondary' sx={{ textAlign: "center", cursor: "pointer" }} onClick={() => navigate("/signup")}>
                    Not registered? Click here to continue
                  </Link>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

      </Container>
    </>


  );
};

export default LogInForm;
