import { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Stack,
  Toolbar,
} from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuthContext } from "../../context/auth/auth.context";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import { logout } from "../../services/auth.service";
import { ConfirmationDialog } from "../StyledComponents/ConfirmationDialog";

import { Account } from "../Account/Account";
import { AccountSettings } from "../../features/settings/components/AccountSettings";

import { NotificationsDrawer } from "../../features/notifications/components/NotificationsDrawer";
import { useNotificationsPanel } from "../../features/notifications/hooks/useNotificationsPanel";

import { ResponsiveNavbarDesktopNav } from "./components/ResponsiveNavbarDesktopNav";
import { ResponsiveNavbarMobileNav } from "./components/ResponsiveNavbarMobileNav";
import { ResponsiveNavbarUserMenu } from "./components/ResponsiveNavbarUserMenu";
import { notificationsUserMenuOption, navbarPages } from "./constants/ResponsiveNavbar.constants";
import { HideOnScroll } from "./shared/ResponsiveNavbar.shared";
import {
  getNavbarPagesForRole,
  samePageLinkNavigation,
} from "./utils/ResponsiveNavbar.utils";

export const ResponsiveNavbar = (props) => {
  const auth = useAuthContext();
  const { value, setIsLoggedIn } = auth;

  const name = value?.name ?? "";
  const isAdmin = (value?.role ?? "user") === "admin" || value?.isAdmin === true;

  const { mode, setMode } = useColorScheme();

  useEffect(() => {
    if (mode !== "dark") setMode("dark");
  }, [mode, setMode]);

  const location = useLocation();
  const navigate = useNavigate();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const {
    notifications,
    unreadCount,
    openDrawer,
    openDialog,
    openNotificationsDrawer,
    closeNotificationsDrawer,
    openRemoveDialog,
    closeRemoveDialog,
    removeSelectedNotification,
    handleInvitationAction,
  } = useNotificationsPanel();

  const [logoutLoading, setLogoutLoading] = useState(false);
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [openBackdrop, setOpenBackdrop] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
  const [navValue, setNavValue] = useState(0);

  const navPages = useMemo(
    () => getNavbarPagesForRole(navbarPages, isAdmin),
    [isAdmin]
  );

  useEffect(() => {
    const currentPage = navPages.findIndex((page) => location.pathname.startsWith(page.path));
    setNavValue(currentPage !== -1 ? currentPage : 0);
  }, [location.pathname, navPages]);

  const handleNavChangeValue = (event, newNavValue) => {
    if (event.type !== "click" || (event.type === "click" && samePageLinkNavigation(event))) {
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

    const logoutResponse = await logout();

    if (logoutResponse?.success) {
      setOpenLogoutDialog(false);
      setIsLoggedIn(false);
      setLogoutLoading(false);
      return;
    }

    showSnackbarAlert(logoutResponse?.message || "Error during logout", "error");
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
    if (option === notificationsUserMenuOption) {
      await openNotificationsDrawer();
    }
    setAnchorElUser(null);
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
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "center", flexGrow: 1 }}
            >
              <ResponsiveNavbarDesktopNav
                navPages={navPages}
                navValue={navValue}
                onNavChange={handleNavChangeValue}
              />

              <ResponsiveNavbarMobileNav
                anchorElNav={anchorElNav}
                navPages={navPages}
                onOpenNavMenu={handleOpenNavMenu}
                onCloseNavMenu={handleCloseNavMenu}
                onMenuNavigation={handleMenuNavigation}
              />

              <ResponsiveNavbarUserMenu
                mode={mode}
                name={name}
                unreadCount={unreadCount}
                anchorElUser={anchorElUser}
                onOpenUserMenu={handleOpenUserMenu}
                onCloseUserMenu={handleCloseUserMenu}
              />
            </Stack>
          </Toolbar>
        </AppBar>
      </HideOnScroll>

      {openBackdrop && <Account setOpenBackdrop={setOpenBackdrop} />}
      <AccountSettings open={openSettings} setOpen={handleCloseSettings} />

      <ConfirmationDialog
        open={openLogoutDialog}
        onClose={handleCloseLogoutDialog}
        tone="warning"
        title="Log out"
        subtitle="Are you sure you want to log out?"
        actions={[
          {
            id: "cancel-logout",
            label: "Cancel",
            color: "secondary",
            icon: <CancelOutlinedIcon />,
            onClick: handleCloseLogoutDialog,
          },
          {
            id: "confirm-logout",
            label: "Logout",
            color: "warning",
            icon: <InfoOutlinedIcon />,
            autoFocus: true,
            loading: logoutLoading,
            onClick: handleConfirmLogout,
          },
        ]}
      />

      <NotificationsDrawer
        open={openDrawer}
        onClose={closeNotificationsDrawer}
        notifications={notifications}
        openRemoveDialog={openDialog}
        onOpenRemoveDialog={openRemoveDialog}
        onCloseRemoveDialog={closeRemoveDialog}
        onRemoveNotification={removeSelectedNotification}
        onInvitationAction={handleInvitationAction}
      />
    </>
  );
};
