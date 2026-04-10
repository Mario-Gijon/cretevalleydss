import { useEffect } from "react";
import { SvgIcon, Container, Divider, Stack, Typography, Box } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useColorScheme } from "@mui/material/styles";
import { Outlet, useNavigate } from "react-router-dom";

import UELogoDarkSVG from "../../../assets/eu_dark.svg?react";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { notifyAuthStatusFromCookies } from "../utils/authStatus.utils";
import {
  authFooterContainerSx,
  authLayoutContainerSx,
  authLayoutGridSx,
} from "../styles/auth.styles";

const EULogoIcon = (props) => {
  const { mode } = useColorScheme();

  return (
    <SvgIcon
      component={mode === "dark" ? UELogoDarkSVG : UELogoDarkSVG}
      viewBox="0 0 240 80"
      {...props}
    />
  );
};

const AuthLayout = () => {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { mode, setMode } = useColorScheme();
  const navigate = useNavigate();

  const toggleTheme = () => {
    setMode(mode === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    notifyAuthStatusFromCookies(showSnackbarAlert);
  }, [showSnackbarAlert]);

  return (
    <Box className="dashboard-background" sx={authLayoutContainerSx}>
      <Grid container justifyContent="center" alignItems="flex-end" sx={authLayoutGridSx}>
        <Outlet context={{ navigate, toggleTheme }} />

        <Container maxWidth="xxl" sx={authFooterContainerSx}>
          <Divider />
          <Stack
            direction={{ sm: "column", md: "row" }}
            sx={{ pt: 5 }}
            spacing={{ sm: 0, md: 3 }}
            alignItems="flex-start"
            justifyContent="center"
            width="100%"
          >
            <EULogoIcon sx={{ fontSize: 190, height: "auto" }} />
            <Typography sx={{ fontSize: 13, width: { sm: "100%", md: "60%", lg: "40%" } }}>
              Co-funded by the European Union under grant agreement no. 101136139. Views and
              opinions expressed are however those of the author(s) only and do not necessarily
              reflect those of the European Union or CINEA. Neither the European Union nor the
              granting authority can be held responsible for them.
            </Typography>
          </Stack>
        </Container>
      </Grid>
    </Box>
  );
};

export default AuthLayout;