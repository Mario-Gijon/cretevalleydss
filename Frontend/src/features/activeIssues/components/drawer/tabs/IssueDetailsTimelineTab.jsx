import { Box, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TimelineIcon from "@mui/icons-material/Timeline";

import { IssueTimeline } from "../../../../../components/IssueTimeline/IssueTimeline";
import { getIssueDetailsDrawerPanelSx } from "../shell/IssueDetailsDrawer.parts";

/**
 * Pestaña Timeline del drawer de detalles del issue.
 *
 * @param {Object} props Props del componente.
 * @param {Object|null} props.selectedIssue Issue seleccionado.
 * @param {string} props.deadlineLabel Fecha límite visible.
 * @returns {JSX.Element}
 */
const IssueDetailsTimelineTab = ({
  selectedIssue,
  deadlineLabel,
}) => {
  const theme = useTheme();

  return (
    <Stack spacing={1.5}>
      <Box sx={{ ...getIssueDetailsDrawerPanelSx(theme, { bg: 0.10 }), p: 1.75 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          <TimelineIcon fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
            Timeline
          </Typography>
        </Stack>

        {selectedIssue?.ui?.deadline?.hasDeadline || selectedIssue?.closureDate ? (
          <IssueTimeline
            creationDate={selectedIssue?.creationDate}
            closureDate={deadlineLabel}
          />
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No deadline defined.
          </Typography>
        )}
      </Box>
    </Stack>
  );
};

export default IssueDetailsTimelineTab;