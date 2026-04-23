import { Box, IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";

import { LogoIcon } from "../shared/ResponsiveNavbar.shared";

/**
 * Renderiza la navegacion mobile del navbar.
 *
 * @param {object} props
 * @param {*} props.anchorElNav Anchor del menu mobile.
 * @param {object[]} props.navPages Paginas disponibles.
 * @param {Function} props.onOpenNavMenu Abre menu mobile.
 * @param {Function} props.onCloseNavMenu Cierra menu mobile.
 * @param {Function} props.onMenuNavigation Navega desde menu mobile.
 * @returns {*}
 */
export const ResponsiveNavbarMobileNav = ({
  anchorElNav,
  navPages,
  onOpenNavMenu,
  onCloseNavMenu,
  onMenuNavigation,
}) => {
  return (
    <Stack
      direction="row"
      spacing={0}
      sx={{ justifyContent: "space-between", alignItems: "center", display: { xs: "flex", md: "none" } }}
    >
      <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none", alignItems: "center", justifyContent: "center" } }}>
        <IconButton
          size="large"
          aria-label="open navigation menu"
          aria-controls="menu-nav"
          aria-haspopup="true"
          onClick={onOpenNavMenu}
          color="inherit"
          edge="start"
        >
          <MenuIcon />
        </IconButton>

        <Menu
          id="menu-nav"
          anchorEl={anchorElNav}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          keepMounted
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          open={Boolean(anchorElNav)}
          onClose={onCloseNavMenu}
          MenuListProps={{ sx: { bgcolor: "background.paper", color: "text.primary" } }}
        >
          {navPages.map((page) => (
            <MenuItem key={page.label} onClick={() => onMenuNavigation(page)}>
              <Typography sx={{ textAlign: "center" }}>{page.label}</Typography>
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <Stack direction="row" spacing={0.2} useFlexGap sx={{ display: { xs: "flex", md: "none" }, flexGrow: 1 }}>
        <LogoIcon sx={{ fontSize: "40px" }} />
        <Typography
          variant="h6"
          noWrap
          sx={{
            display: { xs: "flex", md: "none", alignItems: "center", justifyContent: "center" },
            flexGrow: 1,
            fontFamily: "monospace",
            fontWeight: 700,
            letterSpacing: ".2rem",
            color: "inherit",
            textDecoration: "none",
          }}
        >
          DSS
        </Typography>
      </Stack>
    </Stack>
  );
};
