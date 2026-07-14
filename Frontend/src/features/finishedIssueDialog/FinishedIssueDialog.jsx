import { Backdrop, Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { CircularLoading } from "../../../components/LoadingProgress/CircularLoading";
import { GlassDialog } from "../../../components/StyledComponents/GlassDialog";
import { getFinishedIssueDialogAuroraBg } from "./styles/finishedIssueDialog.styles";
import { FinishedIssueDialogProvider } from "./context/finishedIssueDialog.provider";
import { useFinishedIssueDialogContext } from "./context/finishedIssueDialog.context";
import FinishedIssueDialogHeader from "./shell/FinishedIssueDialogHeader";
import FinishedIssueDialogLayout from "./shell/FinishedIssueDialogLayout";
import FinishedIssueAddModelHost from "./shell/FinishedIssueAddModelHost";

/**
 * Contenido interno del dialogo de finished issue.
 *
 * @returns {JSX.Element}
 */
const FinishedIssueDialogBody = () => {
  const theme = useTheme();
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
          ...getFinishedIssueDialogAuroraBg(theme, 0.1),
          backdropFilter: "blur(10px)",
        },
      }}
    >
      <FinishedIssueDialogHeader />

      {dialog.loadingInfo || !dialog.issue?.summary ? (
        <Backdrop open sx={{ zIndex: 999999 }}>
          <CircularLoading color="secondary" size={50} height="50vh" />
        </Backdrop>
      ) : (
        <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 2 }}>
          <FinishedIssueDialogLayout />
        </Box>
      )}
      <FinishedIssueAddModelHost />
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
