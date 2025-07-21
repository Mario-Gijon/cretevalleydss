// Importaciones necesarias
import { Backdrop, Paper, Typography, Stack, Box, Divider, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect } from 'react';
import { useAuthContext } from '../../context/auth/auth.context';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
/* import { useColorScheme } from '@mui/material'; */

// Componente Account
export const Account = ({ setOpenBackdrop }) => {
  // Control del modo claro u oscuro usando el hook useColorScheme
  /* const { mode } = useColorScheme() */

  // Obtiene los valores del contexto de autenticación
  const { value: { name, university, email, accountCreation } } = useAuthContext();

  // Función para cerrar el backdrop
  const handleCloseBackdrop = () => {
    setOpenBackdrop(false); // Cierra el backdrop
  };

  // Función para evitar el cierre cuando se hace clic dentro del Paper
  const handlePaperClick = (e) => {
    e.stopPropagation(); // Detiene la propagación del clic al Backdrop
  };

  // Crear un array de campos
  const userFields = [
    { label: 'Name', value: name },
    { label: 'University', value: university },
    { label: 'Email', value: email },/* 
    { label: 'Issues Participations', value: 8 }, // Agrega el dato correspondiente si es necesario */
    { label: 'Sign-Up Date', value: accountCreation }
  ];

  // Efecto para bloquear el scroll del body cuando el backdrop está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden'; // Deshabilita el scroll del body

    // Restaurar el scroll del body cuando el componente se desmonte
    return () => {
      document.body.style.overflow = ''; // Restaura el scroll del body
    };
  }, []);

  return (
    // Componente Backdrop de Material UI
    <Backdrop
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%', // Asegura que ocupe toda la altura de la pantalla
      }}
      open={true}
      onClick={handleCloseBackdrop} // Cierra el Backdrop si se hace clic fuera del Paper
    >
      {/* Componente Paper de Material UI */}
      <Paper
        sx={{
          p: "40px",
          px: "70px",
          maxHeight: '80%',
          overflow: 'auto',
          borderRadius: 2,
          boxShadow: 3,
          position: 'relative', // Necesario para la posición de la cruz
          maxWidth: '600px', // Limita el ancho máximo del Paper
          minWidth: { xs: "300px", sm: "430px" }
        }}
        elevation={6}
        square={false}
        onClick={handlePaperClick} // Impide que el clic en el Paper cierre el Backdrop
      >
        {/* Botón para cerrar el modal */}
        <IconButton
          onClick={handleCloseBackdrop}
          sx={{
            position: 'absolute',
            top: 10, // Posición desde la parte superior
            right: 10, // Posición desde la parte derecha
            zIndex: 10, // Asegura que la cruz esté siempre encima del contenido
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Sección de información de cuenta */}
        <Stack direction="column" spacing={3} alignItems="center">
          <Box sx={{ textAlign: 'center', width: { xs: "200px", sm: "260px" } }}>
            {/* Icono de cuenta */}
            <AccountCircleIcon sx={{ fontSize: "80px" }} color='inherit' />
            <Typography variant="h5">
              {userFields[0].value}
            </Typography>
            <Divider sx={{ mt: 2 }} />
          </Box>
          <Box sx={{ textAlign: 'center', justifyContent: 'center', width: { xs: "200px", sm: "260px" } }}>
            {/* Resto de los campos */}
            {userFields.slice(1).map((field, index) => (
              <div key={index}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {field.label}
                </Typography>
                <Typography>{field.value}</Typography>
                <Divider sx={{ my: 2, display: index === (userFields.length - 2) ? "none" : "flex" }} />
              </div>
            ))}
          </Box>
        </Stack>
      </Paper>
    </Backdrop>
  );
};