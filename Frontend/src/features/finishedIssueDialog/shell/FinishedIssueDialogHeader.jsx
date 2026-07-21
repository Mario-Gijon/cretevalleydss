import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { alpha } from "@mui/material/styles";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import TaskAltIcon from '@mui/icons-material/TaskAlt';

import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import { formatFinishedIssuePhaseLabel } from "../logic/formatFinishedIssuePhaseLabel";
import FinishedIssueNavigation from "./FinishedIssueNavigation";
import {
  finishedIssueContentFrameSx,
  finishedIssueHeaderChipSx,
  finishedIssueHeaderControlsSx,
  finishedIssueHeaderIdentitySx,
  finishedIssueHeaderSx,
  finishedIssueHeaderTabsSx,
  finishedIssueHeaderTitleSx,
} from "./finishedIssueShell.styles";

const FinishedIssueDialogHeader = () => {
  const {
    dialog,
    selectedIssue,
    setOpenRemoveConfirmDialog,
    handleCloseFinishedIssueDialog,
    header,
    navigation,
  } = useFinishedIssueDialogContext();

  const issue = dialog.payload?.issue || selectedIssue || {};
  const [executionMenuAnchor, setExecutionMenuAnchor] = useState(null);
  const runLabel = (option) => `${option.label} · ${option.modelName || "—"}`;
  const activeExecution =
    header.executionOptions.find(
      (option) => option.key === header.selectedExecutionKey
    ) || header.executionOptions[0] || null;

  return (
    <Box sx={{ ...finishedIssueHeaderSx, background: alpha("#07111c", 0.92) }}>
      <Box sx={finishedIssueContentFrameSx}>
        <Stack spacing={1.15}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            alignItems={{ xs: "stretch", lg: "flex-start" }}
            justifyContent="space-between"
            spacing={1.4}
          >
            <Box sx={finishedIssueHeaderIdentitySx}>
              <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.105em" }}>
                Finished issue
              </Typography>
              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.35, minWidth: 0 }}>
                <Typography variant="h4" component="h1" noWrap title={issue?.name || ""} sx={finishedIssueHeaderTitleSx}>
                  {issue?.name || "Finished issue"}
                </Typography>
                <TaskAltIcon sx={{ color: "success.main", fontSize: { xs: 25, lg: 29 }, flexShrink: 0 }} />
              </Stack>
            </Box>

            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center" justifyContent={{ xs: "flex-start", lg: "flex-end" }} sx={finishedIssueHeaderControlsSx}>
              <Chip
                label={activeExecution ? runLabel(activeExecution) : "Base · —"}
                icon={activeExecution?.type === "base" ? <LayersRoundedIcon /> : <ScienceRoundedIcon />}
                clickable
                onClick={(event) => setExecutionMenuAnchor(event.currentTarget)}
                color="secondary"
                variant="outlined"
                sx={finishedIssueHeaderChipSx(false)}
                aria-label="Select execution"
              />
              <Menu
                anchorEl={executionMenuAnchor}
                open={Boolean(executionMenuAnchor)}
                onClose={() => setExecutionMenuAnchor(null)}
                MenuListProps={{ sx: { maxHeight: 360, minWidth: 260 } }}
              >
                {header.executionOptions.map((option) => (
                  <MenuItem
                    key={option.key}
                    selected={option.key === header.selectedExecutionKey}
                    onClick={() => {
                      header.selectExecution(option.key);
                      setExecutionMenuAnchor(null);
                    }}
                  >
                    {option.type === "base" ? <LayersRoundedIcon fontSize="small" /> : <ScienceRoundedIcon fontSize="small" />}
                    <Box sx={{ ml: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap title={runLabel(option)}>{option.label}</Typography>
                      <Typography variant="caption" noWrap sx={{ color: "text.secondary" }}>{option.modelName}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
              <Tooltip title="Add model"><IconButton aria-label="Add model" color="secondary" onClick={header.openAddScenario}><AddRoundedIcon /></IconButton></Tooltip>
              <Tooltip title="Remove issue"><IconButton aria-label="Remove issue" onClick={() => setOpenRemoveConfirmDialog(true)} sx={{ ml: { lg: 0.5 } }}><DeleteOutlineIcon color="error" /></IconButton></Tooltip>
              <Tooltip title="Close"><IconButton aria-label="Close Finished Issue" onClick={handleCloseFinishedIssueDialog}><CloseIcon /></IconButton></Tooltip>
            </Stack>
          </Stack>

          {header.showRounds ? <Tabs value={header.selectedPhase} onChange={(_, value) => header.changePhase(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile indicatorColor="secondary" textColor="inherit" sx={finishedIssueHeaderTabsSx}>
            {header.basePhases.map((phase) => <Tab key={phase} value={phase} label={formatFinishedIssuePhaseLabel({ phase, orderedPhases: header.basePhases })} />)}
          </Tabs> : null}

          <FinishedIssueNavigation navigation={navigation} />
        </Stack>
      </Box>
    </Box>
  );
};

export default FinishedIssueDialogHeader;
