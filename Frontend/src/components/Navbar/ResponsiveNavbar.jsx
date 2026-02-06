import { useState, useEffect, useMemo } from 'react';
import { Grow, Dialog, DialogActions, CircularProgress, DialogTitle, AppBar, Box, Toolbar, IconButton, Typography, Menu, MenuItem, Avatar, Button, Tooltip, Divider, Stack, Zoom, useScrollTrigger, Slide, SvgIcon, Drawer, List, ListItem, ListItemText, Badge, Chip, DialogContent } from '@mui/material';
import Tab from '@mui/material/Tab';
import { Menu as MenuIcon, Logout as LogoutIcon, Person as PersonIcon, Settings as SettingsIcon } from '@mui/icons-material';
import EmailIcon from '@mui/icons-material/Email';
import { styled, useColorScheme } from "@mui/material/styles";
import CancelIcon from '@mui/icons-material/Cancel';
import { useLocation, useNavigate } from "react-router-dom";
import LogoSVG from "../../assets/logo.svg?react";
import { useAuthContext } from "../../context/auth/auth.context";
import { logout, markAllNotificationsAsRead, removeNotification } from '../../controllers/authController';
import { Account } from "../Account/Account";
import { Settings } from "../Settings/Settings";
import { GradientTabs } from '../StyledComponents/GradientTabs';
/* import { MaterialUISwitch } from './customStyles/MaterialUISwitch'; */
import { options, pages, samePageLinkNavigation } from './navbarUtils';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { changeInvitationStatus } from '../../controllers/issueController';
import { useIssuesDataContext } from '../../context/issues/issues.context';
import { useSnackbarAlertContext } from '../../context/snackbarAlert/snackbarAlert.context';

const StyledBadge = styled(Badge)(() => ({
  '& .MuiBadge-badge': {
    right: -1,
    top: 10
  }
}));

// Componente para ocultar el AppBar cuando se hace scroll
const HideOnScroll = (props) => {
  // Obtiene las propiedades children y window
  const { children, window } = props;
  // Usa el hook useScrollTrigger para detectar el scroll
  const trigger = useScrollTrigger({ target: window ? window() : undefined });

  // Devuelve el componente AppBar solo cuando no se hace scroll
  return <Slide appear={false} direction="down" in={!trigger}>{children ?? <div />}</Slide>
}

const LogoIcon = (props) => {
  return <SvgIcon component={LogoSVG} viewBox="0 0 200 200" {...props} />;
};

// Componente principal de la barra de navegación responsive
export const ResponsiveNavbar = (props) => {

  const { value: { name }, setIsLoggedIn, notifications, setNotifications } = useAuthContext();
  const { fetchActiveIssues } = useIssuesDataContext()
  const { mode, setMode } = useColorScheme()

  setMode("dark")

  const location = useLocation();
  const navigate = useNavigate();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [logoutLoading, setLogoutLoading] = useState(false);
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [openBackdrop, setOpenBackdrop] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const [navValue, setNavValue] = useState(0);
  const [openDrawer, setOpenDrawer] = useState(false); // Estado para abrir/cerrar el drawer
  const [unreadCount, setUnreadCount] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);

  // Función para abrir el diálogo
  const handleDialogOpen = (notificationId) => {
    setSelectedNotificationId(notificationId);
    setOpenDialog(true);
  };

  // Función para cerrar el diálogo
  const handleDialogClose = () => {
    setSelectedNotificationId(null);  // Limpiar el ID seleccionado al cerrar el diálogo
    setOpenDialog(false);
  };

  // Función para eliminar la notificación
  const handleRemoveNotification = async () => {

    const notificationRemoved = await removeNotification(selectedNotificationId);

    if (notificationRemoved.success) {
      setNotifications(notifications.filter(notification => notification._id !== selectedNotificationId))
    } else {
      showSnackbarAlert(notificationRemoved.msg, "error");
    }
    setOpenDialog(false); // Cerrar el diálogo después de eliminar

  };

  useEffect(() => {
    const currentPage = pages.findIndex(page => location.pathname.startsWith(page.path));
    if (currentPage !== -1) {
      setNavValue(currentPage);
    }
  }, [location]);

  // Llamar a esta función cuando se obtienen las notificaciones
  useEffect(() => {
    const notificationsUnread = notifications.filter(notification => !notification.read).length
    setUnreadCount(notificationsUnread);
  }, [notifications]);

  const handleNavChangeValue = (event, newNavValue) => {
    // event.type can be equal to focus with selectionFollowsFocus.
    if (event.type !== 'click' || (event.type === 'click' && samePageLinkNavigation(event))) {
      if (newNavValue === 3) {
        showSnackbarAlert("Models page is not available yet", "info");
        return
      }
      setNavValue(newNavValue)
      // Cambia la ruta según el índice del tab
      navigate(pages[newNavValue].url); // Navegamos a la URL correspondiente
    }
  };

  const handleOpenLogoutDialog = () => setOpenLogoutDialog(true)

  const handleCloseLogoutDialog = () => setOpenLogoutDialog(false)

  const handleConfirmLogout = async () => {
    setLogoutLoading(true);

    // Llama a la función de logout
    if (logout()) {
      // Cierra el diálogo
      setOpenLogoutDialog(false);
      // Cambia el estado después de los 5 segundos
      setIsLoggedIn(false);
      setLogoutLoading(false);
    }

    // Cierra el diálogo
    setOpenLogoutDialog(false);
    setLogoutLoading(false);
  };

  /* const toggleTheme = () => { setMode(mode === "dark" ? "light" : "dark") } */

  const handleOpenNavMenu = (event) => setAnchorElNav(event.currentTarget)

  const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget)

  const handleCloseNavMenu = () => setAnchorElNav(null)

  const handleCloseSettings = () => setOpenSettings(false)

  const handleCloseUserMenu = async (option) => {
    if (option === "Logout") handleOpenLogoutDialog()
    if (option === "Account") setOpenBackdrop(true)
    if (option === "Settings") setOpenSettings(true)
    if (option === "Notifications") {
      setOpenDrawer(true);
      await markAllNotificationsAsRead();
      setNotifications((prevNotifications) => prevNotifications.map((notif) => ({ ...notif, read: true })));
    }
    setAnchorElUser(null)
  };

  const handleInvitationAction = async (issueId, action) => {
    if (action !== "accepted" && action !== "declined") return;

    const invitationChanged = await changeInvitationStatus(issueId, action);

    if (invitationChanged.success) {
      // Actualizar estado de la notificación sin necesidad de recargar
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.issueId === issueId
            ? { ...notification, responseStatus: action === "accepted" ? "Invitation accepted" : "Invitation declined" }
            : notification
        )
      );

      if (action === "accepted") {
        fetchActiveIssues(); // Si es necesario, puedes seguir trayendo los issues activos
        showSnackbarAlert(invitationChanged.msg, "success");
      } else {
        showSnackbarAlert(invitationChanged.msg, "warning");
      }
    } else {
      showSnackbarAlert(invitationChanged.msg, "error");
    }
  };


  const handleMenuNavigation = ({ label, url }) => {
    label === "Models" ? showSnackbarAlert("Models page is not available yet", "info") : navigate(url)
    handleCloseNavMenu(); // Cerramos el menú
  };

  const pathToTabIndex = useMemo(() => ({
    '/dashboard/active': 0,
    '/dashboard/finished': 1,
    '/dashboard/create': 2,
    '/dashboard/models': 3
  }), []);

  useEffect(() => {
    // Obtener el valor de navValue basado en la ruta actual
    setNavValue(pathToTabIndex[location.pathname] || 0);  // Default a 0 si no coincide
  }, [pathToTabIndex, location.pathname]);

  return (
    <>
      <HideOnScroll {...props}>
        <AppBar
          elevation={3}
          enableColorOnDark
          sx={{
            background: "rgba(30, 51, 72, 0.85)",      // transparente tipo glass
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(1px)",
            boxShadow: "0 1px 30px 0 rgba(34, 79, 98, 0.44)",
          }}
        >
          <Toolbar sx={{ position: "relative", color: "#FFFFFF", overflow: "hidden" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexGrow: 1 }} >
              {/* Pantalla grande */}
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", display: { xs: 'none', md: 'flex' } }} >
                {/* Título del sitio */}
                <Box sx={{ display: 'flex', flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                  <LogoIcon sx={{ fontSize: "50px", }} />
                  <Typography
                    variant="h6"
                    noWrap
                    component="a"
                    sx={{
                      mr: 2,
                      display: { xs: 'none', md: 'flex' },
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      letterSpacing: '.2rem',
                      color: 'inherit',
                      textDecoration: 'none'
                    }}
                  >
                    CRETE-VALLEY-DSS
                  </Typography>
                </Box>
                <Divider orientation="vertical" variant="middle" flexItem sx={{ display: { xs: 'none', md: 'flex' } }} />
                {/* Menú de secciones */}
                <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, pl: "8px", alignItems: "center" }}>
                  <GradientTabs
                    value={navValue}
                    onChange={handleNavChangeValue}
                    role="navigation"
                    textColor="white"
                    indicatorColor="secondary"
                    centered
                  >
                    {pages.map((page) => (
                      <Tab key={page.label} sx={{ my: 0.3 }} label={page.label} />
                    ))}
                  </GradientTabs>
                </Box>
              </Stack>

              {/* Pantalla pequeña */}
              <Stack direction="row" spacing={0} sx={{ justifyContent: "space-between", alignItems: "center", display: { xs: 'flex', md: 'none' } }} >
                {/* Menú de navegación para dispositivos pequeños (hamburguesa) */}
                <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none', alignItems: "center", justifyContent: "center" } }}>
                  <IconButton
                    size="large"
                    aria-label="account of current user"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    onClick={handleOpenNavMenu}
                    color="inherit"
                    edge="start"
                  >
                    <MenuIcon />
                  </IconButton>
                  <Menu
                    id="menu-appbar"
                    anchorEl={anchorElNav}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                    open={Boolean(anchorElNav)}
                    onClose={handleCloseNavMenu}
                    MenuListProps={{ sx: { bgcolor: "background.paper", color: "text.primary" } }}
                  >
                    {pages.map((page) => (
                      <MenuItem key={page.label} onClick={() => { handleMenuNavigation(page) }}>
                        <Typography sx={{ textAlign: 'center' }}>{page.label}</Typography>
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>
                {/* Nombre de app para pantallas pequeñas */}
                <Stack direction="row" spacing={0.2} useFlexGap sx={{ display: { xs: 'flex', md: 'none' }, flexGrow: 1 }}>
                  <LogoIcon sx={{ fontSize: "40px", }} />
                  {/* <AdbIcon sx={{ display: { xs: 'flex', md: 'none' } }} /> */}
                  <Typography
                    variant="h6"
                    noWrap
                    sx={{
                      display: { xs: 'flex', md: 'none', alignItems: "center", justifyContent: "center" },
                      flexGrow: 1,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      letterSpacing: '.2rem',
                      color: 'inherit',
                      textDecoration: 'none',
                    }}
                  >
                    DSS
                  </Typography>
                </Stack>
              </Stack>

              {/* Opciones del usuario */}
              <Stack direction="row" spacing={2} sx={{ justifyContent: "center", alignItems: "center" }}>
                {/* Icono de usuario para abrir el menú de opciones */}
                <Tooltip title="Open options" arrow slots={{ transition: Zoom }}>
                  <IconButton onClick={handleOpenUserMenu} sx={{ p: 0, border: `2px solid ${mode === "dark" ? "#F5F0F6" : "#F5F0F6"}` }}>
                    <StyledBadge badgeContent={unreadCount} color="error" invisible={unreadCount === 0}>
                      <Avatar sx={{ bgcolor: "inherit", color: "#F5F0F6" }}>{name.charAt(0).toUpperCase()}</Avatar>
                    </StyledBadge>
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Toolbar>
        </AppBar>
      </HideOnScroll >

      {/* Aquí se muestra el Backdrop cuando openBackdrop es verdadero */}
      {openBackdrop && <Account setOpenBackdrop={setOpenBackdrop} />}
      {/* Aquí se muestra el Settings cuando openSettings es verdadero */}
      <Settings open={openSettings} setOpen={handleCloseSettings} />
      {/* Diálogo de confirmación de logout */}
      <Dialog open={openLogoutDialog} onClose={handleCloseLogoutDialog}>
        <DialogTitle>Are you sure you want to log out?</DialogTitle>
        <DialogActions>
          <Button onClick={handleCloseLogoutDialog} color="secondary" startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmLogout}
            color="error"
            autoFocus
            disabled={logoutLoading}
            startIcon={!logoutLoading && <LogoutIcon />}
          >
            {logoutLoading && <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />}
            Logout
          </Button>
        </DialogActions>
      </Dialog>
      {/* Menú de opciones del usuario */}
      <Menu
        id="menu-appbar"
        anchorEl={anchorElUser}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        keepMounted
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={Boolean(anchorElUser)}
        onClose={handleCloseUserMenu}
        TransitionComponent={Grow}
        sx={{ mt: '40px' }}
        MenuListProps={{ sx: { bgcolor: "background.paper", color: "text.primary" } }}
      >
        {options.map((option) => (
          <MenuItem key={option} onClick={() => handleCloseUserMenu(option)}>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ justifyContent: "center", alignItems: "center" }}
            >
              {option === "Account" && <PersonIcon />}
              {option === "Notifications" && (
                <Badge variant='dot' overlap='circular' anchorOrigin={{ horizontal: 'left' }} badgeContent={unreadCount} color="error" invisible={unreadCount === 0}>
                  <EmailIcon />
                </Badge>
              )}
              {option === "Settings" && <SettingsIcon />}
              {option === "Logout" && <LogoutIcon color='error' />}
              <Typography color={option === "Logout" && "error"} sx={{ textAlign: 'center' }}>{option}</Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>

      {/* Drawer para las notificaciones */}
      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        elevation={1}
        PaperProps={{
          sx: {
            background: "rgba(23, 30, 36, 1)",
            border: "1px solid rgba(255,255,255,0.05)",
          }
        }}
        sx={{
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <Stack width={{ xs: "100%" }} justifyContent={"center"} p={2} spacing={1.5}>
          {/* Contenedor flex para alinear el título y el botón */}
          <Stack direction={"row"} justifyContent={"flex-end"} alignItems={"center"} mb={1}>
            {/* Título */}
            <Typography variant="h5" fontWeight={"bold"} sx={{ flexGrow: 1 }}>Notifications</Typography>
            {/* Botón de cerrar visible siempre */}
            <IconButton onClick={() => setOpenDrawer(false)} edge="end"><ArrowForwardIosIcon /></IconButton>
          </Stack>
          <Divider />
          {/* Verificar si hay notificaciones */}
          {notifications.length === 0 ? (
            <Typography variant="body1" color="gray" sx={{ textAlign: "center", padding: 2 }}>
              You have no notifications
            </Typography>
          ) : (
            <List sx={{ maxWidth: 550, display: "flex", flexDirection: "column", gap: 2 }}>
              {notifications.map((notification) => {
                const date = new Date(notification.createdAt);
                const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} - ${date.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}`;

                return (
                  <Stack key={notification._id} direction={'column'} p={2} sx={{ bgcolor: "background.paper", borderRadius: 2, boxShadow: 3 }}>
                    <ListItem disablePadding>
                      {/* Contenido de la notificación */}
                      <Stack flexGrow={1} spacing={1.5}>
                        <ListItemText
                          primary={
                            <Stack direction={"row"} justifyContent={"space-between"} alignItems={'flex-start'} sx={{ mb: 0.7 }}>
                              <Stack direction={"row"} spacing={2} alignItems={"center"}>
                                <Typography variant="h6">
                                  {notification.header}
                                </Typography>
                                {!notification.read && <Chip label="New" color='warning' variant="outlined" size='small' />}
                              </Stack>
                              <IconButton size="small" edge="end" onClick={() => handleDialogOpen(notification._id)}>
                                <CloseIcon />
                              </IconButton>
                            </Stack>
                          }
                          secondary={
                            <>
                              <Divider />
                              <Typography variant="body1" sx={{ mb: 1, mt: 1.5 }}>
                                {notification.message}
                              </Typography>
                              <Typography variant="caption" color="gray">
                                {formattedDate}
                              </Typography>
                            </>
                          }
                        />
                        {/* Mostrar botones o mensaje si la notificación requiere acción */}
                        {notification.requiresAction ? (
                          notification.responseStatus ? (
                            <Stack direction="row">
                              <Button
                                variant="outlined"
                                size="small"
                                disabled
                              >
                                {notification.responseStatus}
                              </Button>
                            </Stack>

                          ) : (
                            <Stack direction="row" spacing={1}>
                              <Button
                                variant="outlined"
                                color="success"
                                size="small"
                                onClick={() => handleInvitationAction(notification.issueId, "accepted")}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => handleInvitationAction(notification.issueId, "declined")}
                              >
                                Decline
                              </Button>
                            </Stack>
                          )
                        ) : null}

                      </Stack>
                    </ListItem>
                  </Stack>
                )
              })}
            </List>
          )}
        </Stack>
      </Drawer>
      {/* Diálogo de confirmación */}
      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Are you sure you want to remove the notification?</DialogTitle>
        <DialogContent>
          {/* Aquí puedes agregar más contenido si lo deseas */}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleRemoveNotification} color="error">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
