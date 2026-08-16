import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import { alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";

import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import { formatFinishedIssuePhaseLabel } from "../logic/formatFinishedIssuePhaseLabel";
import FinishedIssueNavigation from "./FinishedIssueNavigation";
import {
  finishedIssueContentFrameSx,
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const issue = dialog.payload?.issue || selectedIssue || {};
  const [mobileActionsMenuAnchor, setMobileActionsMenuAnchor] = useState(null);
  const closeMobileActionsMenu = () => setMobileActionsMenuAnchor(null);

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
              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.35, minWidth: 0, maxWidth: "100%" }}>
                <Typography variant="h4" component="h1" noWrap title={issue?.name || ""} sx={{ ...finishedIssueHeaderTitleSx, flex: 1 }}>
                  {issue?.name || "Finished issue"}
                </Typography>
                {isMobile ? <IconButton aria-label="Open issue actions" onClick={(event) => setMobileActionsMenuAnchor(event.currentTarget)} sx={{ flexShrink: 0 }}><MoreVertIcon /></IconButton> : null}
              </Stack>
            </Box>

            {!isMobile ? <Stack direction="row" spacing={0.75} alignItems="center" justifyContent={{ xs: "flex-start", lg: "flex-end" }} sx={finishedIssueHeaderControlsSx}>
              <Tooltip title="Remove issue"><IconButton aria-label="Remove issue" onClick={() => setOpenRemoveConfirmDialog(true)} sx={{ ml: { lg: 0.5 } }}><DeleteOutlineIcon color="error" /></IconButton></Tooltip>
              <Tooltip title="Close"><IconButton aria-label="Close Finished Issue" onClick={handleCloseFinishedIssueDialog}><CloseIcon /></IconButton></Tooltip>
            </Stack> : null}
            {isMobile ? <Menu
              anchorEl={mobileActionsMenuAnchor}
              open={Boolean(mobileActionsMenuAnchor)}
              onClose={closeMobileActionsMenu}
              MenuListProps={{ sx: { maxHeight: 360, minWidth: 260 } }}
            >
              <MenuItem onClick={() => { closeMobileActionsMenu(); setOpenRemoveConfirmDialog(true); }} sx={{ color: "error.main" }}>
                <DeleteOutlineIcon fontSize="small" /><Typography sx={{ ml: 1 }}>Remove issue</Typography>
              </MenuItem>
              <MenuItem onClick={() => { closeMobileActionsMenu(); handleCloseFinishedIssueDialog(); }}>
                <CloseIcon fontSize="small" /><Typography sx={{ ml: 1 }}>Close dialog</Typography>
              </MenuItem>
            </Menu> : null}
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
