import { Avatar, Box, IconButton, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

import { Pill } from "../shared/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";

/**
 * Cabecera sticky del dialogo de issue finalizado.
 *
 * @returns {JSX.Element}
 */
const FinishedIssueDialogHeader = () => {
  const theme = useTheme();

  const {
    selectedIssue,
    setOpenRemoveConfirmDialog,
    handleCloseFinishedIssueDialog,
    header,
  } = useFinishedIssueDialogContext();

  const {
    selectedRunKey,
    selectedModelNameView,
    showRounds,
    currentPhaseIndex,
    roundsCount,
    handleChangePhase,
  } = header;

  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 2.25 },
        pt: 1.35,
        pb: 1.15,
        position: "sticky",
        top: 0,
        zIndex: 10,
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        background: alpha("#0B1118", 0.55),
        backdropFilter: "blur(12px)",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: alpha(theme.palette.success.main, 0.14),
              color: "success.main",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <AssignmentTurnedInIcon />
          </Avatar>

          <Stack spacing={0.2} sx={{ minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 980,
                lineHeight: 1.05,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={selectedIssue?.name || ""}
            >
              {selectedIssue?.name || "Finished issue"}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Pill tone={selectedRunKey === "base" ? "success" : "secondary"}>
                {selectedRunKey === "base" ? "Base" : "Simulation"}
              </Pill>
              <Pill tone="info">{selectedModelNameView}</Pill>
            </Stack>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Remove issue" arrow>
            <IconButton
              onClick={() => setOpenRemoveConfirmDialog(true)}
              sx={{
                border: "1px solid rgba(255,255,255,0.12)",
                bgcolor: alpha(theme.palette.error.main, 0.1),
                "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.14) },
              }}
            >
              <DeleteOutlineIcon color="error" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Close" arrow>
            <IconButton
              onClick={handleCloseFinishedIssueDialog}
              sx={{
                border: "1px solid rgba(255,255,255,0.12)",
                bgcolor: alpha(theme.palette.common.white, 0.06),
                "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.09) },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {showRounds ? (
        <Box sx={{ mt: 1.25 }}>
          <Tabs
            value={currentPhaseIndex}
            onChange={(_, value) => handleChangePhase(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            indicatorColor="secondary"
            textColor="inherit"
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                minHeight: 40,
                textTransform: "none",
                fontWeight: 950,
                borderRadius: 999,
                px: 2,
                mr: 1,
                bgcolor: alpha(theme.palette.common.white, 0.04),
                border: "1px solid rgba(255,255,255,0.10)",
              },
              "& .MuiTab-root.Mui-selected": {
                bgcolor: alpha(theme.palette.secondary.main, 0.12),
                borderColor: alpha(theme.palette.secondary.main, 0.35),
              },
              "& .MuiTabs-indicator": { height: 0 },
            }}
          >
            {Array.from({ length: roundsCount }).map((_, index) => (
              <Tab key={index} label={`Round ${index + 1}`} />
            ))}
          </Tabs>
        </Box>
      ) : null}
    </Box>
  );
};

export default FinishedIssueDialogHeader;
