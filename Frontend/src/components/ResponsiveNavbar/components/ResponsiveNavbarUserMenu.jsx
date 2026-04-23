import {
  Avatar,
  Grow,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  Zoom,
} from "@mui/material";
import {
  Logout as LogoutIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

import { NotificationsMenuItemIcon } from "../../../features/notifications/components/NotificationsMenuItemIcon";
import {
  notificationsUserMenuOption,
  userMenuOptions,
} from "../constants/ResponsiveNavbar.constants";
import { StyledBadge } from "../shared/ResponsiveNavbar.shared";

/**
 * Renderiza el boton-avatar y el menu de usuario.
 *
 * @param {object} props
 * @param {string} props.mode Modo de color actual.
 * @param {string} props.name Nombre del usuario.
 * @param {number} props.unreadCount Numero de notificaciones no leidas.
 * @param {*} props.anchorElUser Anchor del menu de usuario.
 * @param {Function} props.onOpenUserMenu Abre menu de usuario.
 * @param {Function} props.onCloseUserMenu Cierra menu de usuario.
 * @returns {*}
 */
export const ResponsiveNavbarUserMenu = ({
  mode,
  name,
  unreadCount,
  anchorElUser,
  onOpenUserMenu,
  onCloseUserMenu,
}) => {
  return (
    <>
      <Stack direction="row" spacing={2} sx={{ justifyContent: "center", alignItems: "center" }}>
        <Tooltip title="Open options" arrow slots={{ transition: Zoom }}>
          <IconButton
            onClick={onOpenUserMenu}
            aria-controls="menu-user"
            aria-haspopup="true"
            sx={{ p: 0, border: `2px solid ${mode === "dark" ? "#F5F0F6" : "#F5F0F6"}` }}
          >
            <StyledBadge badgeContent={unreadCount} color="error" invisible={unreadCount === 0}>
              <Avatar sx={{ bgcolor: "inherit", color: "#F5F0F6" }}>
                {(name?.charAt(0) ?? "").toUpperCase()}
              </Avatar>
            </StyledBadge>
          </IconButton>
        </Tooltip>
      </Stack>

      <Menu
        id="menu-user"
        anchorEl={anchorElUser}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        keepMounted
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        open={Boolean(anchorElUser)}
        onClose={onCloseUserMenu}
        TransitionComponent={Grow}
        sx={{ mt: "40px" }}
        MenuListProps={{ sx: { bgcolor: "background.paper", color: "text.primary" } }}
      >
        {userMenuOptions.map((option) => (
          <MenuItem key={option} onClick={() => onCloseUserMenu(option)}>
            <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center", alignItems: "center" }}>
              {option === "Account" && <PersonIcon />}
              {option === notificationsUserMenuOption && (
                <NotificationsMenuItemIcon unreadCount={unreadCount} />
              )}
              {option === "Settings" && <SettingsIcon />}
              {option === "Logout" && <LogoutIcon color="error" />}
              <Typography color={option === "Logout" && "error"} sx={{ textAlign: "center" }}>
                {option}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
