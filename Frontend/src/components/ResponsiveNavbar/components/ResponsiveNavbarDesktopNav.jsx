import { Box, Divider, Stack, Typography } from "@mui/material";
import Tab from "@mui/material/Tab";

import { GradientTabs } from "../../StyledComponents/GradientTabs";
import { LogoIcon } from "../shared/ResponsiveNavbar.shared";

/**
 * Renderiza la navegacion desktop del navbar.
 *
 * @param {object} props
 * @param {object[]} props.navPages Paginas disponibles.
 * @param {number} props.navValue Indice de pagina activa.
 * @param {Function} props.onNavChange Cambio de tab.
 * @returns {*}
 */
export const ResponsiveNavbarDesktopNav = ({ navPages, navValue, onNavChange }) => {
  return (
    <Stack
      direction="row"
      sx={{ justifyContent: "space-between", alignItems: "center", display: { xs: "none", md: "flex" } }}
    >
      <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
        <LogoIcon sx={{ fontSize: "50px" }} />
        <Typography
          variant="h6"
          noWrap
          component="a"
          sx={{
            mr: 2,
            display: { xs: "none", md: "flex" },
            fontFamily: "monospace",
            fontWeight: 700,
            letterSpacing: ".2rem",
            color: "inherit",
            textDecoration: "none",
          }}
        >
          CRETE-VALLEY-DSS
        </Typography>
      </Box>

      <Divider orientation="vertical" variant="middle" flexItem sx={{ display: { xs: "none", md: "flex" } }} />

      <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, pl: "8px", alignItems: "center" }}>
        <GradientTabs
          value={navValue}
          onChange={onNavChange}
          role="navigation"
          textColor="white"
          indicatorColor="secondary"
          centered
        >
          {navPages.map((page) => (
            <Tab key={page.label} sx={{ my: 0.3 }} label={page.label} />
          ))}
        </GradientTabs>
      </Box>
    </Stack>
  );
};
