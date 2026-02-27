import { useState, useEffect, useMemo } from 'react';
import {
  Grow,
  Dialog,
  DialogActions,
  CircularProgress,
  DialogTitle,
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Button,
  Tooltip,
  Divider,
  Stack,
  Zoom,
  useScrollTrigger,
  Slide,
  SvgIcon,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Badge,
  Chip,
  DialogContent
} from '@mui/material';
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
  const { children, window } = props;
  const trigger = useScrollTrigger({ target: window ? window() : undefined });
  return <Slide appear={false} direction="down" in={!trigger}>{children ?? <div />}</Slide>;
};

const LogoIcon = (props) => {
  return <SvgIcon component={LogoSVG} viewBox="0 0 200 200" {...props} />;
};

// Componente principal de la barra de navegación responsive
export const ResponsiveNavbar = (props) => {

  const auth = useAuthContext();
  const { value, setIsLoggedIn, notifications, setNotifications } = auth;

  const name = value?.name ?? "";
  const isAdmin = (value?.role ?? "user") === "admin" || value?.isAdmin === true;

  const { fetchActiveIssues } = useIssuesDataContext();
  const { mode, setMode } = useColorScheme();

  // Evita setMode en cada render
  useEffect(() => {
    if (mode !== "dark") setMode("dark");
  }, [mode, setMode]);

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
  const [openDrawer, setOpenDrawer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);

  // ✅ Admin justo a la derecha de Models (sin duplicar) y solo visible para admins
  const navPages = useMemo(() => {
    const adminPage = { label: "Admin", url: "/dashboard/admin", path: "/dashboard/admin" };
    const cloned = Array.isArray(pages) ? [...pages] : [];

    const alreadyHasAdmin = cloned.some(p => p?.label === "Admin");
    if (!alreadyHasAdmin) {
      const modelsIndex = cloned.findIndex(p => p?.label === "Models");
      if (modelsIndex >= 0) cloned.splice(modelsIndex + 1, 0, adminPage);
      else cloned.push(adminPage);
    }

    return isAdmin ? cloned : cloned.filter(p => p?.label !== "Admin");
  }, [isAdmin]);

  const handleDialogOpen = (notificationId) => {
    setSelectedNotificationId(notificationId);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setSelectedNotificationId(null);
    setOpenDialog(false);
  };

  const handleRemoveNotification = async () => {
    const notificationRemoved = await removeNotification(selectedNotificationId);

    if (notificationRemoved.success) {
      setNotifications(notifications.filter(n => n._id !== selectedNotificationId));
    } else {
      showSnackbarAlert(notificationRemoved.msg, "error");
    }
    setOpenDialog(false);
  };

  // Sync tab con ruta actual
  useEffect(() => {
    const currentPage = navPages.findIndex(page => location.pathname.startsWith(page.path));
    setNavValue(currentPage !== -1 ? currentPage : 0);
  }, [location.pathname, navPages]);

  useEffect(() => {
    const notificationsUnread = notifications.filter(notification => !notification.read).length;
    setUnreadCount(notificationsUnread);
  }, [notifications]);

  const handleNavChangeValue = (event, newNavValue) => {
    if (event.type !== 'click' || (event.type === 'click' && samePageLinkNavigation(event))) {
      const selected = navPages[newNavValue];
      if (!selected) return;

      if (selected.label === "Models") {
        showSnackbarAlert("Models page is not available yet", "info");
        return;
      }

      if (selected.label === "Admin" && !isAdmin) {
        showSnackbarAlert("You don't have permission to access Admin panel", "warning");
        return;
      }

      setNavValue(newNavValue);
      navigate(selected.url);
    }
  };

  const handleOpenLogoutDialog = () => setOpenLogoutDialog(true);
  const handleCloseLogoutDialog = () => setOpenLogoutDialog(false);

  const handleConfirmLogout = async () => {
    setLogoutLoading(true);

    if (logout()) {
      setOpenLogoutDialog(false);
      setIsLoggedIn(false);
      setLogoutLoading(false);
    }

    setOpenLogoutDialog(false);
    setLogoutLoading(false);
  };

  const handleOpenNavMenu = (event) => setAnchorElNav(event.currentTarget);
  const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);

  const handleCloseNavMenu = () => setAnchorElNav(null);
  const handleCloseSettings = () => setOpenSettings(false);

  const handleCloseUserMenu = async (option) => {
    if (option === "Logout") handleOpenLogoutDialog();
    if (option === "Account") setOpenBackdrop(true);
    if (option === "Settings") setOpenSettings(true);
    if (option === "Notifications") {
      setOpenDrawer(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    }
    setAnchorElUser(null);
  };

  const handleInvitationAction = async (issueId, action) => {
    if (action !== "accepted" && action !== "declined") return;

    const invitationChanged = await changeInvitationStatus(issueId, action);

    if (invitationChanged.success) {
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.issueId === issueId
            ? { ...notification, responseStatus: action === "accepted" ? "Invitation accepted" : "Invitation declined" }
            : notification
        )
      );

      if (action === "accepted") {
        fetchActiveIssues();
        showSnackbarAlert(invitationChanged.msg, "success");
      } else {
        showSnackbarAlert(invitationChanged.msg, "warning");
      }
    } else {
      showSnackbarAlert(invitationChanged.msg, "error");
    }
  };

  const handleMenuNavigation = ({ label, url }) => {
    if (label === "Models") {
      showSnackbarAlert("Models page is not available yet", "info");
    } else if (label === "Admin" && !isAdmin) {
      showSnackbarAlert("You don't have permission to access Admin panel", "warning");
    } else {
      navigate(url);
    }
    handleCloseNavMenu();
  };

  console.log(auth)

  return (
    <>
      <HideOnScroll {...props}>
        <AppBar
          elevation={0}
          enableColorOnDark
          sx={{
            
            backgroundColor: "rgba(10, 16, 24, 0.72)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            
            boxShadow: "0 18px 50px rgba(0,0,0,0.38)",
            overflow: "hidden",
            "&:before": {
              content: '""',
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: [
                "linear-gradient(90deg, rgba(74, 187, 175, 0.46) 0%, rgba(21, 63, 76, 0.58) 38%, rgba(6, 11, 17, 0.92) 100%)",
                "radial-gradient(680px 260px at 0% 45%, rgba(95, 205, 255, 0.22), transparent 62%)",
                "radial-gradient(520px 200px at 55% -20%, rgba(160, 225, 255, 0.12), transparent 60%)",
              ].join(","),
              opacity: 0.95,
            },
            "&:after": {
              content: '""',
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 35%, transparent 70%)",
              opacity: 0.35,
            },
          }}
        >
          <Toolbar sx={{ position: "relative", color: "#FFFFFF", overflow: "hidden" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexGrow: 1 }}>

              {/* Pantalla grande */}
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", display: { xs: 'none', md: 'flex' } }}>
                <Box sx={{ display: 'flex', flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                  <LogoIcon sx={{ fontSize: "50px" }} />
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

                <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, pl: "8px", alignItems: "center" }}>
                  <GradientTabs
                    value={navValue}
                    onChange={handleNavChangeValue}
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

              {/* Pantalla pequeña */}
              <Stack direction="row" spacing={0} sx={{ justifyContent: "space-between", alignItems: "center", display: { xs: 'flex', md: 'none' } }}>
                <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none', alignItems: "center", justifyContent: "center" } }}>
                  <IconButton
                    size="large"
                    aria-label="open navigation menu"
                    aria-controls="menu-nav"
                    aria-haspopup="true"
                    onClick={handleOpenNavMenu}
                    color="inherit"
                    edge="start"
                  >
                    <MenuIcon />
                  </IconButton>

                  <Menu
                    id="menu-nav"
                    anchorEl={anchorElNav}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    keepMounted
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    open={Boolean(anchorElNav)}
                    onClose={handleCloseNavMenu}
                    MenuListProps={{ sx: { bgcolor: "background.paper", color: "text.primary" } }}
                  >
                    {navPages.map((page) => (
                      <MenuItem key={page.label} onClick={() => handleMenuNavigation(page)}>
                        <Typography sx={{ textAlign: 'center' }}>{page.label}</Typography>
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>

                <Stack direction="row" spacing={0.2} useFlexGap sx={{ display: { xs: 'flex', md: 'none' }, flexGrow: 1 }}>
                  <LogoIcon sx={{ fontSize: "40px" }} />
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
                <Tooltip title="Open options" arrow slots={{ transition: Zoom }}>
                  <IconButton
                    onClick={handleOpenUserMenu}
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

            </Stack>
          </Toolbar>
        </AppBar>
      </HideOnScroll>

      {openBackdrop && <Account setOpenBackdrop={setOpenBackdrop} />}
      <Settings open={openSettings} setOpen={handleCloseSettings} />

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

      <Menu
        id="menu-user"
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
            <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center", alignItems: "center" }}>
              {option === "Account" && <PersonIcon />}
              {option === "Notifications" && (
                <Badge
                  variant='dot'
                  overlap='circular'
                  anchorOrigin={{ horizontal: 'left' }}
                  badgeContent={unreadCount}
                  color="error"
                  invisible={unreadCount === 0}
                >
                  <EmailIcon />
                </Badge>
              )}
              {option === "Settings" && <SettingsIcon />}
              {option === "Logout" && <LogoutIcon color='error' />}
              <Typography color={option === "Logout" && "error"} sx={{ textAlign: 'center' }}>
                {option}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>

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
          <Stack direction={"row"} justifyContent={"flex-end"} alignItems={"center"} mb={1}>
            <Typography variant="h5" fontWeight={"bold"} sx={{ flexGrow: 1 }}>Notifications</Typography>
            <IconButton onClick={() => setOpenDrawer(false)} edge="end"><ArrowForwardIosIcon /></IconButton>
          </Stack>
          <Divider />

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

                        {notification.requiresAction ? (
                          notification.responseStatus ? (
                            <Stack direction="row">
                              <Button variant="outlined" size="small" disabled>
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
                );
              })}
            </List>
          )}
        </Stack>
      </Drawer>

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Are you sure you want to remove the notification?</DialogTitle>
        <DialogContent />
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
