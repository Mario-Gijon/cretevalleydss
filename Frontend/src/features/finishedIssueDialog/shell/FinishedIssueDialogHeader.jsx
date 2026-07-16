import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";

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
  const lifecycle = dialog.payload?.lifecycle || {};
  const runLabel = (option) =>
    `${option.label} · ${option.modelName || "—"}${
      option.status === "error" ? " · Failed" : ""
    }`;

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
              <Typography sx={{ color: "text.secondary", fontSize: 11, lineHeight: 1.2, fontWeight: 900, letterSpacing: "0.105em", textTransform: "uppercase" }}>
                Finished issue
              </Typography>
              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.35, minWidth: 0 }}>
                <CheckCircleRoundedIcon sx={{ color: "success.main", fontSize: { xs: 25, lg: 29 }, flexShrink: 0 }} />
                <Typography noWrap title={issue?.name || ""} sx={finishedIssueHeaderTitleSx}>
                  {issue?.name || "Finished issue"}
                </Typography>
                <Chip size="small" color="success" label="Finished" title={lifecycle.closureDate ? `Finished ${lifecycle.closureDate}` : "Finished"} sx={{ flexShrink: 0, fontWeight: 900 }} />
              </Stack>
              {issue?.description ? <Typography title={issue.description} sx={{ mt: 0.75, maxWidth: 760, color: "text.secondary", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 13.5, lineHeight: 1.45, fontWeight: 600 }}>
                {issue.description}
              </Typography> : null}
            </Box>

            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center" justifyContent={{ xs: "flex-start", lg: "flex-end" }} sx={finishedIssueHeaderControlsSx}>
              {header.executionOptions.map((option) => <Chip key={option.key} label={runLabel(option)} icon={option.type === "base" ? <LayersRoundedIcon /> : undefined} clickable onClick={() => header.selectExecution(option.key)} color={option.status === "error" ? "error" : header.selectedExecutionKey === option.key ? "secondary" : "default"} variant={header.selectedExecutionKey === option.key ? "filled" : "outlined"} sx={finishedIssueHeaderChipSx(option.status === "error")} />)}
              <Button variant="outlined" color="secondary" startIcon={<AddIcon />} onClick={header.openAddScenario} sx={{ minHeight: 34, borderRadius: 1.45, textTransform: "none", fontSize: 12.5, fontWeight: 900 }}>
                Add model
              </Button>
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
