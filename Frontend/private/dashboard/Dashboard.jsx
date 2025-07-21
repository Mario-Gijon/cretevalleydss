
// Importa componentes de Material UI
import { Stack, Container, SvgIcon, Typography, Divider } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";

// Outlet para renderizar las subrutas
import { Outlet } from "react-router-dom";
import { GoUpButton } from "../../src/components/GoUpButton/GoUpButton";
import { ResponsiveNavbar } from "../../src/components/Navbar/ResponsiveNavbar";

import { IssuesDataProvider } from "../../src/context/issues/issues.provider";

import UELogoDarkSVG from "../../src/assets/eu_dark.svg?react";
import UELogoLightSVG from "../../src/assets/eu_light.svg?react";

const EULogoIcon = (props) => {
  const { mode } = useColorScheme()
  return <SvgIcon component={mode === 'dark' ? UELogoDarkSVG : UELogoLightSVG} viewBox="0 0 240 80"{...props} />;
  
};

// Componente Dashboard
export const Dashboard = () => {
  return (
    <IssuesDataProvider>
      <ResponsiveNavbar />
      <Stack direction="column" sx={{ justifyContent: "center", alignItems: "stretch", width: "100%" }}>
        <Container maxWidth="xxl" sx={{ paddingTop: { xs: 8, sm: 9, md: 10 }, minHeight: { xs: "60vh", sm: "80vh", md: "86vh" } }}>
          <Outlet />
        </Container>
        <GoUpButton />
      </Stack>
      <Container maxWidth="xxl" sx={{ pt: { sx: 1, sm: 2, md: 3, lg: 4 }, pb: 2 }}>
        <Divider />
        <Stack direction={{ sm: "column", md: "row" }} sx={{ pt: 5 }} spacing={{ sm: 0, md: 3 }} alignItems={"flex-start"} justifyContent={"center"} width={"100%"}>
          <EULogoIcon sx={{ fontSize: 190, height: "auto" }} />
          <Typography sx={{ fontSize: 12, textAlign: "justify", width: { sm: "100%", md: "60%", lg: "40%" } }}>
            Co-funded by the European Union under grant agreement no. 101136139. Views and opinions expressed are however those of the author(s) only and do not necessarily reflect those of the European Union or CINEA. Neither the European Union nor the granting authority can be held responsible for them.
          </Typography>
        </Stack>
      </Container>
    </IssuesDataProvider>
  );
};

export default Dashboard