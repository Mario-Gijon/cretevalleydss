import { Badge } from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";

/**
 * Renderiza el icono de notificaciones dentro del menu de usuario.
 *
 * @param {object} props
 * @param {number} props.unreadCount Numero de notificaciones sin leer.
 * @returns {*}
 */
export const NotificationsMenuItemIcon = ({ unreadCount }) => {
  return (
    <Badge
      variant="dot"
      overlap="circular"
      anchorOrigin={{ horizontal: "left" }}
      badgeContent={unreadCount}
      color="error"
      invisible={unreadCount === 0}
    >
      <EmailIcon />
    </Badge>
  );
};
