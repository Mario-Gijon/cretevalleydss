// Importación de componentes de Material UI
import { Card, CardContent, Typography, Container, FormHelperText, CircularProgress, Button, Stack, Link, Divider, Box, InputAdornment, IconButton, Input, InputLabel, FormControl, /* useColorScheme */ } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
/* import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode"; */

// Importación de hooks de React y otras bibliotecas
import { useState } from 'react';

// Utilidad para validar el formulario
import { validateForm } from './utils/validationUtils';

// Utilidades para manejar valores y errores del formulario
import { initialFormValues, initialErrors, handleFormChange } from './utils/formUtils';

// Función para realizar el registro
import { signup } from '../../../src/controllers/authController';
import { useOutletContext } from 'react-router-dom';
import { useSnackbarAlertContext } from '../../../src/context/snackbarAlert/snackbarAlert.context';

// Componente SignUpForm
const SignUpForm = () => {

  const {showSnackbarAlert} = useSnackbarAlertContext()
  const { navigate, /* toggleTheme */ } = useOutletContext();
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
    // Reinicia los valores del formulario
    setFormValues(initialFormValues);
    // Reinicia los errores
    setErrors(initialErrors);
  };

  // Función para manejar el envío del formulario
  const handleSignUp = async (e) => {
    // Prevenir el comportamiento por defecto del formulario
    e.preventDefault();

    // Validar los datos del formulario
    const newErrors = validateForm(formValues);
    // Establecer los errores de validación
    setErrors(newErrors);

    // Si no hay errores
    if (Object.keys(newErrors).length === 0) {
      try {
        // Establece el estado de carga en verdadero
        setLoading(true);

        // Hacer la solicitud de registro
        const data = await signup(formValues);

        // Manejo de errores de la respuesta
        if (data.errors) {
          // Establecer los errores recibidos en la respuesta
          setErrors(data.errors);
          // Mostrar mensaje de error
          //showSnackbar('There are errors in the form', 'error');
        } else {
          // Reiniciar los errores
          setErrors(initialErrors);
          // Mostrar mensaje de éxito
          showSnackbarAlert('Signup successfully, check your email for confirmation', 'success');
          // Cambiar al formulario de inicio de sesión
          navigate('/login');
        }
      } catch (error) {
        // Manejo de errores en la solicitud
        console.error('Error submitting the form:', error);
        // Mostrar mensaje de error si ocurre una excepción
        showSnackbarAlert('An error occurred while submitting the form', 'error');
      } finally {
        // Establecer el estado de carga en falso
        setLoading(false);
      }
    }
  };

  // Función para manejar el evento de presionar "Enter" en los campos de entrada
  const handleKeyDown = (e, nextFieldId) => {
    // Si se presiona la tecla "Enter"
    if (e.key === 'Enter') {
      // Obtiene el siguiente campo
      const nextField = document.getElementById(nextFieldId);
      // Mueve el foco al siguiente campo
      if (nextField) {
        nextField.focus();
      }
    }
  };

  // Función para manejar el evento de presionar "Enter" en el último campo (Enviar formulario)
  const handleKeyDownSubmit = (e) => {
    // Si se presiona la tecla "Enter"
    if (e.key === 'Enter') {
      // Envía el formulario
      handleSignUp(e);
    }
  };

  return (
    <>
      {/* Botón para cambiar el tema */}
      <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        {/* <IconButton onClick={toggleTheme}>
          {mode === "dark" ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton> */}
      </Box>
      <Container maxWidth="sm" flexDirection="column" justifyContent="center" alignItems="center">
        <Card raised sx={{ padding: '5px' }}>
          <CardContent sx={{ width: "100%" }}>
            <Stack direction="column" spacing={3} sx={{ padding: '15px', paddingX: '20px' }}>
              <Typography variant="h2" sx={{ fontWeight: 'bold', paddingBottom: '10px' }}>Sign Up</Typography>

              {/* Fila para nombre y usuario */}
              <Stack direction="row" spacing={3} sx={{ width: '100%' }}>
                {/* Campo de nombre */}
                <FormControl variant="standard" color="secondary" error={!!errors.name} sx={{ flex: 1 }}>
                  <InputLabel htmlFor="name">Name</InputLabel>
                  <Input
                    id="name"
                    name="name"
                    value={formValues.name}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 'email')}  // Mueve el foco al campo email
                    autoComplete="off"
                  />
                  {errors.name && <FormHelperText>{errors.name}</FormHelperText>}  {/* Muestra el error si existe */}
                </FormControl>
                {/* Campo de universidad */}
                <FormControl variant="standard" color="secondary" error={!!errors.university} sx={{ flex: 1 }}>
                  <InputLabel htmlFor="university">University</InputLabel>
                  <Input
                    id="university"
                    name="university"
                    value={formValues.university}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, 'name')}  // Mueve el foco al campo name
                    autoComplete="off"
                  />
                  {errors.university && <FormHelperText>{errors.university}</FormHelperText>}  {/* Muestra el error si existe */}
                </FormControl>
              </Stack>

              {/* Campo de correo electrónico */}
              <FormControl variant="standard" color="secondary" error={!!errors.email}>
                <InputLabel htmlFor="email">Email</InputLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formValues.email}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, 'password')}  // Mueve el foco al campo password
                  autoComplete="off"
                />
                {errors.email && <FormHelperText>{errors.email}</FormHelperText>}  {/* Muestra el error si existe */}
              </FormControl>

              {/* Campo de contraseña */}
              <FormControl variant="standard" color="secondary" error={!!errors.password}>
                <InputLabel htmlFor="password">Password</InputLabel>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formValues.password}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, 'repeatPassword')}  // Mueve el foco al campo repeatPassword
                  autoComplete="off"
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton onClick={handleClickShowPassword}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                />
                <FormHelperText>1 number, 1 letter, min 6</FormHelperText>  {/* Mensaje de ayuda */}
              </FormControl>

              {/* Campo de confirmación de contraseña */}
              <FormControl variant="standard" color="secondary" error={!!errors.repeatPassword}>
                <InputLabel htmlFor="repeatPassword">Repeat Password</InputLabel>
                <Input
                  id="repeatPassword"
                  name="repeatPassword"
                  type={showRepeatPassword ? 'text' : 'password'}
                  value={formValues.repeatPassword}
                  onChange={handleChange}
                  onKeyDown={handleKeyDownSubmit}  // Envía el formulario al presionar Enter
                  autoComplete="off"
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton onClick={handleClickShowRepeatPassword}>
                        {showRepeatPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                />
                {errors.repeatPassword && <FormHelperText>{errors.repeatPassword}</FormHelperText>}  {/* Muestra el error si existe */}
              </FormControl>

              <Box>
                {/* Botones de acción */}
                <Stack direction={"row"} spacing={2} sx={{ justifyContent: "center", alignItems: "center", pb: 4 }}>
                  <Button variant="contained" color='secondary' disabled={loading} onClick={handleSignUp}>
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Sign Up"}
                  </Button>
                  <Divider orientation="vertical" flexItem />
                  <Button variant="outlined" color='inherit' onClick={handleRestart}>Restart</Button>
                </Stack>
                {/* Enlace para cambiar al formulario de inicio de sesión */}
                <Stack direction={"column"} spacing={2} sx={{ justifyContent: "center", alignItems: "center" }}>
                  <Link underline="hover" color='secondary' sx={{ textAlign: "center", cursor: "pointer" }} onClick={() => navigate("/login")}>
                    Already registered? Click here to continue
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

export default SignUpForm;
