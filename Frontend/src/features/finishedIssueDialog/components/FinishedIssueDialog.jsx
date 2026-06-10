import { Backdrop, Box, IconButton, Stack, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

import { CircularLoading } from "../../../components/LoadingProgress/CircularLoading";
import { GlassDialog } from "../../../components/StyledComponents/GlassDialog";
import { getFinishedIssueDialogAuroraBg } from "../styles/finishedIssueDialog.styles";
import { FinishedIssueDialogProvider } from "../context/finishedIssueDialog.provider";
import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import FinishedIssueDialogHeader from "./FinishedIssueDialogHeader";
import FinishedIssueDialogLayout from "./FinishedIssueDialogLayout";

/**
 * Contenido interno del dialogo de finished issue.
 *
 * @returns {JSX.Element}
 */
const FinishedIssueDialogBody = () => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const {
    openFinishedIssueDialog,
    handleCloseFinishedIssueDialog,
    dialog,
    roundsNavigation,
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
          <FinishedIssueDialogLayout isMdUp={isMdUp} />

          {roundsNavigation.showRounds ? (
            <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "center" }}>
              <IconButton
                color="secondary"
                disabled={roundsNavigation.currentPhaseIndex === 0}
                onClick={roundsNavigation.handlePreviousRound}
                sx={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: alpha(theme.palette.common.white, 0.06),
                  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.09) },
                }}
              >
                <ArrowBackIosIcon />
              </IconButton>

              <IconButton
                color="secondary"
                disabled={
                  roundsNavigation.currentPhaseIndex === roundsNavigation.roundsCount - 1
                }
                onClick={roundsNavigation.handleNextRound}
                sx={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: alpha(theme.palette.common.white, 0.06),
                  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.09) },
                }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </Stack>
          ) : null}
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
