import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { formatNotificationDate } from "../logic/notificationDisplay";
import { ConfirmationDialog } from "../../../components/StyledComponents/ConfirmationDialog";

/**
 * Renderiza el panel lateral de notificaciones y el dialogo de eliminacion.
 *
 * @param {object} props
 * @param {boolean} props.open Indica si el drawer esta abierto.
 * @param {Function} props.onClose Cierra el drawer.
 * @param {object[]} props.notifications Notificaciones visibles.
 * @param {boolean} props.openRemoveDialog Indica si el dialogo de borrado esta abierto.
 * @param {Function} props.onOpenRemoveDialog Abre el dialogo de borrado para una notificacion.
 * @param {Function} props.onCloseRemoveDialog Cierra el dialogo de borrado.
 * @param {Function} props.onRemoveNotification Confirma la eliminacion de notificacion.
 * @param {Function} props.onInvitationAction Gestiona acciones de invitacion.
 * @returns {*}
 */
export const NotificationsDrawer = ({
  open,
  onClose,
  notifications,
  openRemoveDialog,
  onOpenRemoveDialog,
  onCloseRemoveDialog,
  onRemoveNotification,
  onInvitationAction,
}) => {
  const theme = useTheme();

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        elevation={1}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 550 },
            borderTopLeftRadius: { xs: 0, sm: 24 },
            borderBottomLeftRadius: { xs: 0, sm: 24 },
            overflow: "hidden",
            background: alpha(theme.palette.background.paper, 0.74),
            border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
            boxShadow: `0 26px 60px ${alpha(theme.palette.common.black, 0.22)}`,
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          },
        }}
        sx={{
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <Stack width={{ xs: "100%" }} justifyContent={"center"} spacing={1.5}>
          <Stack
            direction={"row"}
            justifyContent={"flex-end"}
            alignItems={"center"}
            mb={0}
            px={2}
            pt={2}
            pb={1.7}
            sx={{
              borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
              background: `radial-gradient(900px 320px at 10% 0%, ${alpha(
                theme.palette.info.main,
                0.20
              )}, transparent 62%)`,
            }}
          >
            <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, letterSpacing: 0.1 }}>
              Notifications
            </Typography>
            <IconButton
              onClick={onClose}
              edge="end"
              sx={{
                bgcolor: alpha(theme.palette.common.white, 0.05),
                mr:0.3,
                p:1
              }}
              size="small"
            >
              <ArrowForwardIosIcon />
            </IconButton>
          </Stack>

          {notifications.length === 0 ? (
            <Typography variant="body1" color="gray" sx={{ textAlign: "center", p: 4 }}>
              You have no notifications
            </Typography>
          ) : (
            <List sx={{ maxWidth: 620, display: "flex", flexDirection: "column", gap: 1, px: 2, pb: 2 }}>
              {notifications.map((notification) => {
                const formattedDate = formatNotificationDate(notification.createdAt);
                const isUnread = !notification.read;

                return (
                  <Box
                    key={notification._id}
                    sx={{
                      borderRadius: 3,
                      border: `1px solid ${alpha(
                        isUnread ? theme.palette.info.main : theme.palette.common.white,
                        isUnread ? 0.35 : 0.10
                      )}`,
                      background: `radial-gradient(560px 180px at 0% 0%, ${alpha(
                        theme.palette.info.main,
                        isUnread ? 0.16 : 0.08
                      )}, transparent 68%), ${alpha(theme.palette.common.white, 0.03)}`,
                      boxShadow: `0 14px 32px ${alpha(theme.palette.common.black, 0.14)}`,
                      px: 1.6,
                      py: 1.45,
                      transition: "transform 160ms ease, border-color 160ms ease, background 160ms ease",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        borderColor: alpha(theme.palette.info.main, 0.42),
                        background: `radial-gradient(560px 180px at 0% 0%, ${alpha(
                          theme.palette.info.main,
                          0.18
                        )}, transparent 68%), ${alpha(theme.palette.common.white, 0.04)}`,
                      },
                    }}
                  >
                    <ListItem disablePadding>
                      <Stack flexGrow={1} spacing={1.3}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="h6">{notification.header}</Typography>
                            {isUnread ? (
                              <Chip
                                label="New"
                                color="warning"
                                variant="outlined"
                                size="small"
                              />
                            ) : null}
                          </Stack>

                          <IconButton
                            edge="end"
                            onClick={() => onOpenRemoveDialog(notification._id)}
                            sx={{
                              color: "text.secondary",
                              "&:hover": { bgcolor: "rgba(226, 233, 120, 0.2)" },
                              mr:-1,
                              mt:-0.5,
                              p:0.5
                            }}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Stack>

                        <Typography variant="body1" sx={{ color: "text.primary" }}>
                          {notification.message}
                        </Typography>

                        <Typography variant="caption" color="gray">
                          {formattedDate}
                        </Typography>

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
                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                                onClick={() =>
                                  onInvitationAction(notification.issueId, "accepted")
                                }
                              >
                                Accept
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                                onClick={() =>
                                  onInvitationAction(notification.issueId, "declined")
                                }
                              >
                                Decline
                              </Button>
                            </Stack>
                          )
                        ) : null}
                      </Stack>
                    </ListItem>
                  </Box>
                );
              })}
            </List>
          )}
        </Stack>
      </Drawer>

      <ConfirmationDialog
        open={openRemoveDialog}
        onClose={onCloseRemoveDialog}
        tone="warning"
        title="Remove notification"
        subtitle="Are you sure you want to remove the notification?"
        actions={[
          {
            id: "cancel-remove-notification",
            label: "Cancel",
            color: "secondary",
            icon: <CancelOutlinedIcon />,
            onClick: onCloseRemoveDialog,
          },
          {
            id: "confirm-remove-notification",
            label: "Remove",
            color: "warning",
            icon: <DeleteOutlineIcon />,
            onClick: onRemoveNotification,
          },
        ]}
      />
    </>
  );
};
