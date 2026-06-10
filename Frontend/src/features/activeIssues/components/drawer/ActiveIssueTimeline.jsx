import { Box, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TimelineIcon from "@mui/icons-material/Timeline";
import { LinearProgress } from "@mui/material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { getIssueDetailsDrawerPanelSx } from "./ActiveIssueDrawer.styles";

dayjs.extend(customParseFormat);

const ActiveIssueTimelineBar = ({ creationDate, closureDate }) => {
  const creation = dayjs(creationDate, "DD-MM-YYYY");
  const today = dayjs();
  const closure = closureDate ? dayjs(closureDate, "DD-MM-YYYY") : null;

  let progress = 0;

  if (closure) {
    const totalDays = closure.diff(creation, "days");
    const elapsedDays = today.diff(creation, "days");
    progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  }

  return (
    <Box sx={{ width: "100%", mt: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {creation.format("DD MMM")}
        </Typography>
        {closure ? (
          <Typography variant="caption" color="text.secondary">
            {closure.format("DD MMM")}
          </Typography>
        ) : null}
      </Box>

      {closure ? (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 5,
            backgroundColor: "rgba(200,200,200,0.2)",
            "& .MuiLinearProgress-bar": {
              backgroundColor: progress >= 100 ? "#f44336" : "#2196f3",
            },
          }}
        />
      ) : (
        <Typography variant="caption" color="text.secondary">
          No deadline
        </Typography>
      )}

      {closure ? (
        <Box sx={{ textAlign: "center", mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {progress >= 100
              ? "Closed"
              : `${Math.max(0, closure.diff(today, "days"))} days left`}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
};

/**
 * Pestaña Timeline del drawer de detalles del issue.
 *
 * @param {Object} props Props del componente.
 * @param {Object|null} props.selectedIssue Issue seleccionado.
 * @param {string} props.deadlineLabel Fecha límite visible.
 * @returns {JSX.Element}
 */
const ActiveIssueTimeline = ({
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
          <ActiveIssueTimelineBar
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

export default ActiveIssueTimeline;
