import { forwardRef } from "react";
import {
  Backdrop,
  Button,
  CircularProgress,
  Container,
  Divider,
  Slide,
  Stack,
  Typography,
  useColorScheme,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { alpha, useTheme } from "@mui/material/styles";

import { GlassDialog } from "../../../components/StyledComponents/GlassDialog";

import SettingsHeader from "./SettingsHeader";
import NameField from "./fields/NameField";
import UniversityField from "./fields/UniversityField";
import EmailField from "./fields/EmailField";
import PasswordField from "./fields/PasswordField";
import ConfirmDeleteAccountDialog from "./fields/ConfirmDeleteAccountDialog";
import ConfirmPasswordDialog from "./fields/ConfirmPasswordDialog";
import { useAccountSettings } from "../hooks/useAccountSettings";
import DeleteIcon from '@mui/icons-material/Delete';

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide in direction="down" ref={ref} {...props} />;
});

/**
 * Account settings dialog entry point for profile configuration actions.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.setOpen
 * @returns {JSX.Element}
 */
export function AccountSettings({ open, setOpen }) {
  const { mode } = useColorScheme();
  const theme = useTheme();

  const {
    value,
    university,
    name,
    email,
    password,
    confirmOpen,
    showUniversityReset,
    showNameReset,
    showEmailReset,
    confirmPasswordDialogOpen,
    repeatPassword,
    loadingUniversity,
    loadingName,
    loadingPassword,
    loadingEmail,
    loadingDelete,
    backdropOpen,
    countdown,
    fieldColors,
    errors,
    handleClose,
    handleConfirmDelete,
    handleCancelDelete,
    handleUniversityChange,
    handleNameChange,
    handleEmailChange,
    handlePasswordChange,
    handleDelete,
    handleUniversityModify,
    handleNameModify,
    handleEmailModify,
    handlePasswordModify,
    handleRepeatPassword,
    handleCancelPasswordDialog,
    handleRepeatPasswordChange,
    setBackdropOpen,
  } = useAccountSettings({ open, setOpen });

  return (
    <>
      <GlassDialog
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
        PaperProps={{
          sx: {
            width: { xs: "96%", sm: "92%", md: "860px" },
            maxWidth: "860px",
            borderRadius: 4,
            overflow: "hidden",
            border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
            boxShadow: `0 24px 60px ${alpha(theme.palette.common.black, 0.20)}`,
            background: `radial-gradient(1200px 460px at 8% 0%, ${alpha(
              theme.palette.info.main,
              0.16
            )}, transparent 62%), rgba(16, 24, 34, 0.92)`,
          },
        }}
      >
        <SettingsHeader handleClose={handleClose} />
        <Divider sx={{ opacity: 0.2 }} />

        <Container
          maxWidth="md"
          sx={{
            p: { xs: 2, sm: 2.7, md: 3.2 },
            position: "relative",
            "&:after": {
              content: '""',
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.08)}, transparent 50%)`,
              opacity: 0.18,
            },
          }}
        >
          <Grid
            container
            spacing={2.2}
            justifyContent="center"
            alignItems="stretch"
            sx={{ position: "relative", zIndex: 1 }}
          >
            <Grid item size={{ xs: 12, sm: 6 }}>
              <NameField
                initialValue={value.name}
                value={name}
                setValue={handleNameChange}
                showReset={showNameReset}
                onSave={handleNameModify}
                error={errors.name}
                color={fieldColors.name}
                loading={loadingName}
              />
            </Grid>

            <Grid item size={{ xs: 12, sm: 6 }}>
              <UniversityField
                initialValue={value.university}
                value={university}
                setValue={handleUniversityChange}
                showReset={showUniversityReset}
                onSave={handleUniversityModify}
                error={errors.university}
                color={fieldColors.university}
                loading={loadingUniversity}
              />
            </Grid>

            <Grid item size={{ xs: 12, sm: 6 }}>
              <EmailField
                initialValue={value.email}
                value={email}
                setValue={handleEmailChange}
                showReset={showEmailReset}
                onSave={handleEmailModify}
                error={errors.email}
                color={fieldColors.email}
                loading={loadingEmail}
              />
            </Grid>

            <Grid item size={{ xs: 12, sm: 6 }}>
              <PasswordField
                value={password}
                setValue={handlePasswordChange}
                onSave={handlePasswordModify}
                error={errors.password}
                color={fieldColors.password}
              />
            </Grid>

            <Grid item size={{ xs: 12 }}>
              <Button
                variant="contained"
                color="error"
                fullWidth
                startIcon={<DeleteIcon />}
                onClick={handleConfirmDelete}
                sx={{ borderRadius: 2, fontWeight: 800, textTransform: "none", py: 1.05 }}
              >
                Delete Account
              </Button>
            </Grid>
          </Grid>
        </Container>

        <ConfirmDeleteAccountDialog
          open={confirmOpen}
          handleCancel={handleCancelDelete}
          loading={loadingDelete}
          handleDelete={handleDelete}
        />
        <ConfirmPasswordDialog
          open={confirmPasswordDialogOpen}
          repeatPassword={repeatPassword}
          setRepeatPassword={handleRepeatPasswordChange}
          onCancel={handleCancelPasswordDialog}
          onConfirm={handleRepeatPassword}
          error={errors.repeatPassword}
          loading={loadingPassword}
        />

        <Backdrop
          sx={(currentTheme) => ({
            color: "#fff",
            zIndex: currentTheme.zIndex.drawer + 1,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            background: alpha(currentTheme.palette.background.default, 0.55),
          })}
          open={backdropOpen}
          onClick={() => setBackdropOpen(false)}
        >
          {countdown !== 0 && (
            <Stack spacing={3} direction="column" justifyContent="center" alignItems="center">
              <CircularProgress size="5rem" color={mode === "dark" ? "secondary" : "primary"} />
              <Typography variant="h6" color={mode === "dark" ? "secondary" : "primary"}>
                Redirecting in {countdown}...
              </Typography>
            </Stack>
          )}
        </Backdrop>
      </GlassDialog>
    </>
  );
}
