import { Alert, Backdrop, Box, Stack, Typography } from "@mui/material";
import { alpha, } from "@mui/material/styles";

import { CircularLoading } from "../../components/LoadingProgress/CircularLoading";
import { GlassDialog } from "../../components/StyledComponents/GlassDialog";
import { FinishedIssueDialogProvider } from "./context/finishedIssueDialog.provider";
import { useFinishedIssueDialogContext } from "./context/finishedIssueDialog.context";
import FinishedIssueDialogHeader from "./shell/FinishedIssueDialogHeader";
import FinishedIssueDialogLayout from "./shell/FinishedIssueDialogLayout";
import { finishedIssueContentFrameSx } from "./shell/finishedIssueShell.styles";

/**
 * Contenido interno del dialogo de finished issue.
 *
 * @returns {JSX.Element}
 */
const FinishedIssueDialogBody = () => {
  const {
    openFinishedIssueDialog,
    handleCloseFinishedIssueDialog,
    dialog,
  } = useFinishedIssueDialogContext();

  return (
    <GlassDialog
      open={openFinishedIssueDialog}
      onClose={handleCloseFinishedIssueDialog}
      fullScreen
      PaperProps={{
        elevation: 0,
        sx: {
          bgcolor: alpha("#070B10", 0.72),
          backdropFilter: "blur(10px)",
        },
      }}
    >
      <FinishedIssueDialogHeader />

      {dialog.loading ? (
        <Backdrop open sx={{ zIndex: 999999 }}>
          <CircularLoading color="secondary" size={50} height="50vh" />
        </Backdrop>
      ) : dialog.error ? (
        <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 2 }}>
          <Alert severity="error">Unable to load this Finished Issue.</Alert>
        </Box>
      ) : !dialog.payload ? (
        <Stack alignItems="center" sx={{ px: { xs: 1.5, md: 2.25 }, py: 6 }}>
          <Typography color="text.secondary">Finished Issue information is unavailable.</Typography>
        </Stack>
      ) : (
        <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 2 }}>
          <Box sx={finishedIssueContentFrameSx}>
            <FinishedIssueDialogLayout />
          </Box>
        </Box>
      )}
    </GlassDialog>
  );
};

/**
 * Dialogo de detalle de issue finalizado.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
export const FinishedIssueDialog = ({
  selectedIssue,
  openFinishedIssueDialog,
  handleCloseFinishedIssueDialog,
  setOpenRemoveConfirmDialog,
}) => {
  return (
    <FinishedIssueDialogProvider
      selectedIssue={selectedIssue}
      openFinishedIssueDialog={openFinishedIssueDialog}
      handleCloseFinishedIssueDialog={handleCloseFinishedIssueDialog}
      setOpenRemoveConfirmDialog={setOpenRemoveConfirmDialog}
    >
      <FinishedIssueDialogBody />
    </FinishedIssueDialogProvider>
  );
};

export default FinishedIssueDialog;
