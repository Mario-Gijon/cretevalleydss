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
import { finishedIssueHeaderChipSx, finishedIssueHeaderSx, finishedIssueHeaderTabsSx } from "./finishedIssueShell.styles.js";

const FinishedIssueDialogHeader = () => {
  const theme = useTheme();
  const { selectedIssue, setOpenRemoveConfirmDialog, handleCloseFinishedIssueDialog, header, navigation } = useFinishedIssueDialogContext();
  const runLabel = (option) => `${option.label} · ${option.modelName || "—"}`;

  return <Box sx={{ ...finishedIssueHeaderSx, background: alpha("#0B1118", 0.72) }}>
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
        {header.executionOptions.map((option) => <Chip key={option.key} label={runLabel(option)} icon={option.type === "base" ? <TuneIcon /> : undefined} clickable onClick={() => header.selectExecution(option.key)} color={header.selectedExecutionKey === option.key ? "secondary" : "default"} variant={header.selectedExecutionKey === option.key ? "filled" : "outlined"} sx={finishedIssueHeaderChipSx} />)}
        <Button variant="outlined" size="small" color="secondary" startIcon={<AddIcon />} onClick={header.openAddScenario}>Add model</Button>
      </Stack>

      {header.showRounds ? <Tabs value={header.selectedPhase} onChange={(_, value) => header.changePhase(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile indicatorColor="secondary" textColor="inherit" sx={finishedIssueHeaderTabsSx}>
        {header.basePhases.map((phase) => <Tab key={phase} value={phase} label={formatFinishedIssuePhaseLabel({ phase, orderedPhases: header.basePhases })} />)}
      </Tabs> : null}

      <FinishedIssueNavigation navigation={navigation} />
    </Stack>
  </Box>;
};

export default FinishedIssueDialogHeader;
