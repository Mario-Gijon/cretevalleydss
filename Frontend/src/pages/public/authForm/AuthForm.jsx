// Importaciones necesarias de Material UI, componentes personalizados y bibliotecas adicionales
import { SvgIcon, Container, Divider, Stack, Typography, Box } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useColorScheme } from "@mui/material/styles";
import { Outlet, useNavigate } from "react-router-dom";

// Importa hooks de React
import { useEffect } from "react";

// Importa uso de cookies
import Cookies from "js-cookie";

import UELogoDarkSVG from "../../../assets/eu_dark.svg?react";
/* import UELogoLightSVG from "../../src/assets/eu_light.svg?react"; */
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";

const EULogoIcon = (props) => {
  const { mode } = useColorScheme()
  /* return <SvgIcon component={mode === 'dark' ? UELogoDarkSVG : UELogoLightSVG} viewBox="0 0 240 80"{...props} />; */
  return <SvgIcon component={mode === 'dark' ? UELogoDarkSVG : UELogoDarkSVG} viewBox="0 0 240 80"{...props} />
};

// Componente principal de autenticación que muestra el formulario de LogIn o SignUp
const AuthForm = () => {

  const { showSnackbarAlert } = useSnackbarAlertContext()

  const { mode, setMode } = useColorScheme()
  const navigate = useNavigate();

  // Función para alternar entre el modo oscuro y claro
  const toggleTheme = () => {
    setMode(mode === "dark" ? "light" : "dark"); // Cambia el tema
  };

  // useEffect para manejar el estado de la cuenta a partir de las cookies
  useEffect(() => {
    // Verificar estado de confirmación de cuenta
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

    // Verificar estado de cambio de email
    const emailChangeStatus = Cookies.get("emailChangeStatus");

    if (emailChangeStatus) {
      if (emailChangeStatus === "verified") {
        showSnackbarAlert("Email updated successfully!", "success");
      } else if (emailChangeStatus === "verification_failed") {
        showSnackbarAlert("Email verification failed. Invalid token.", "error");
      } else if (emailChangeStatus === "error") {
        showSnackbarAlert("An error occurred during email verification.", "error");
      }
      Cookies.remove("emailChangeStatus");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    // Contenedor que usa Grid para centrar el contenido
    <Box className="dashboard-background" sx={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      position: "relative",
      overflow: "hidden",
    }}>
      <Grid container justifyContent="center" alignItems="flex-end" sx={{ height: { xs: "90vh", sm: "95vh", md: "98vh" }, pt: 1 }}>
        {/* Condicional para mostrar el formulario adecuado */}
        <Outlet context={{ navigate, toggleTheme }} />
        <Container maxWidth="xxl" sx={{ pt: { sx: 1, sm: 2, md: 3, lg: 4 }, pb: 3 }}>
          <Divider />
          <Stack direction={{ sm: "column", md: "row" }} sx={{ pt: 5 }} spacing={{ sm: 0, md: 3 }} alignItems={"flex-start"} justifyContent={"center"} width={"100%"}>
            <EULogoIcon sx={{ fontSize: 190, height: "auto" }} />
            <Typography sx={{ fontSize: 13, width: { sm: "100%", md: "60%", lg: "40%" } }}>
              Co-funded by the European Union under grant agreement no. 101136139. Views and opinions expressed are however those of the author(s) only and do not necessarily reflect those of the European Union or CINEA. Neither the European Union nor the granting authority can be held responsible for them.
            </Typography>
          </Stack>
        </Container>
      </Grid>
    </Box>

  );
};


export default AuthForm;
