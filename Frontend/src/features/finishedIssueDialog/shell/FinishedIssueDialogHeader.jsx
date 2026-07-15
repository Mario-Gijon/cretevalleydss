import { Avatar, Box, Button, Chip, IconButton, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TuneIcon from "@mui/icons-material/Tune";

import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import { formatFinishedIssuePhaseLabel } from "../logic/formatFinishedIssuePhaseLabel";
import FinishedIssueNavigation from "./FinishedIssueNavigation";

const FinishedIssueDialogHeader = () => {
  const theme = useTheme();
  const { selectedIssue, setOpenRemoveConfirmDialog, handleCloseFinishedIssueDialog, header, navigation } = useFinishedIssueDialogContext();
  const runLabel = (option) => `${option.label} · ${option.modelName || "—"}`;

  return <Box sx={{ px: { xs: 1.5, md: 2.25 }, pt: 1.25, pb: 1, position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid rgba(255,255,255,0.10)", background: alpha("#0B1118", 0.72), backdropFilter: "blur(12px)" }}>
    <Stack spacing={1.1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.25}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.success.main, 0.14), color: "success.main" }}><AssignmentTurnedInIcon /></Avatar>
          <Typography variant="h6" noWrap sx={{ fontWeight: 950, minWidth: 0 }} title={selectedIssue?.name || ""}>{selectedIssue?.name || "Finished issue"}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} flexShrink={0}>
          <Tooltip title="Remove issue"><IconButton onClick={() => setOpenRemoveConfirmDialog(true)}><DeleteOutlineIcon color="error" /></IconButton></Tooltip>
          <Tooltip title="Close"><IconButton onClick={handleCloseFinishedIssueDialog}><CloseIcon /></IconButton></Tooltip>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
        {header.executionOptions.map((option) => <Chip key={option.key} label={runLabel(option)} icon={option.type === "base" ? <TuneIcon /> : undefined} clickable onClick={() => header.handleSelectRun(option.key)} color={header.selectedExecutionKey === option.key ? "secondary" : "default"} variant={header.selectedExecutionKey === option.key ? "filled" : "outlined"} sx={{ maxWidth: { xs: "100%", sm: 280 }, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} />)}
        <Button variant="outlined" size="small" color="secondary" startIcon={<AddIcon />} onClick={header.openAddDialog}>Add model</Button>
      </Stack>

      {header.showRounds ? <Tabs value={header.selectedPhase} onChange={(_, value) => header.handleChangePhase(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile indicatorColor="secondary" textColor="inherit" sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontWeight: 800 } }}>
        {header.basePhases.map((phase) => <Tab key={phase} value={phase} label={formatFinishedIssuePhaseLabel({ phase, orderedPhases: header.basePhases })} />)}
      </Tabs> : null}

      <FinishedIssueNavigation navigation={navigation} />
    </Stack>
  </Box>;
};

export default FinishedIssueDialogHeader;
