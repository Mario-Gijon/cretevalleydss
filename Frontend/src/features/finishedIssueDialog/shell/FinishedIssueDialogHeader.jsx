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
  finishedIssueHeaderRowSx,
  finishedIssueHeaderSx,
  finishedIssueHeaderTabsSx,
} from "./finishedIssueShell.styles";

const FinishedIssueDialogHeader = () => {
  const {
    setOpenRemoveConfirmDialog,
    handleCloseFinishedIssueDialog,
    header,
    navigation,
  } = useFinishedIssueDialogContext();

  const theme = useTheme();
  const isCompactLayout = useMediaQuery(theme.breakpoints.down("lg"));
  const [mobileActionsMenuAnchor, setMobileActionsMenuAnchor] = useState(null);
  const closeMobileActionsMenu = () => setMobileActionsMenuAnchor(null);

  return (
    <Box sx={{ ...finishedIssueHeaderSx, background: alpha("#07111c", 0.92) }}>
      <Box sx={finishedIssueContentFrameSx}>
        <Stack spacing={0.9}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={finishedIssueHeaderRowSx}
          >
            <FinishedIssueNavigation navigation={navigation} />

            <Stack direction="row" spacing={0.75} alignItems="center" sx={finishedIssueHeaderControlsSx}>
              {isCompactLayout ? (
                <IconButton aria-label="Open issue actions" onClick={(event) => setMobileActionsMenuAnchor(event.currentTarget)}>
                  <MoreVertIcon />
                </IconButton>
              ) : (
                <Tooltip title="Remove issue"><IconButton aria-label="Remove issue" onClick={() => setOpenRemoveConfirmDialog(true)}><DeleteOutlineIcon color="error" /></IconButton></Tooltip>
              )}
              <Tooltip title="Close"><IconButton aria-label="Close Finished Issue" onClick={handleCloseFinishedIssueDialog}><CloseIcon /></IconButton></Tooltip>
            </Stack>
            {isCompactLayout ? <Menu
              anchorEl={mobileActionsMenuAnchor}
              open={Boolean(mobileActionsMenuAnchor)}
              onClose={closeMobileActionsMenu}
              MenuListProps={{ sx: { maxHeight: 360, minWidth: 260 } }}
            >
              <MenuItem onClick={() => { closeMobileActionsMenu(); setOpenRemoveConfirmDialog(true); }} sx={{ color: "error.main" }}>
                <DeleteOutlineIcon fontSize="small" /><Typography sx={{ ml: 1 }}>Remove issue</Typography>
              </MenuItem>
            </Menu> : null}
          </Stack>

          {header.showRounds ? <Tabs value={header.selectedPhase} onChange={(_, value) => header.changePhase(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile indicatorColor="secondary" textColor="inherit" sx={finishedIssueHeaderTabsSx}>
            {header.basePhases.map((phase) => <Tab key={phase} value={phase} label={formatFinishedIssuePhaseLabel({ phase, orderedPhases: header.basePhases })} />)}
          </Tabs> : null}
        </Stack>
      </Box>
    </Box>
  );
};

export default FinishedIssueDialogHeader;
