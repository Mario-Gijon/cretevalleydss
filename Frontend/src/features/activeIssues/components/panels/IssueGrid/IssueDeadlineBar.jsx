import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

import { computeIssueDeadlineProgress } from "./utils/issuesGrid.utils";
import { getIssueDeadlineColorByProgress } from "./styles/issuesGrid.styles";

/**
 * Barra de deadline mostrada en la card del issue.
 *
 * @param {Object} props Props del componente.
 * @param {Object|null} props.issue Issue a renderizar.
 * @returns {JSX.Element}
 */
const IssueDeadlineBar = ({ issue }) => {
  const theme = useTheme();

  const hasServerDeadline = Boolean(issue?.ui?.deadline?.hasDeadline);
  const hasLegacyDeadline = Boolean(issue?.closureDate);

  if (!hasServerDeadline && !hasLegacyDeadline) {
    return (
      <Box
        sx={{
          mt: 0.9,
          display: "flex",
          alignItems: "center",
          gap: 0.8,
          color: alpha(theme.palette.common.white, 0.7),
        }}
      >
        <CalendarMonthIcon sx={{ fontSize: 16, opacity: 0.75 }} />
        <Typography variant="caption" sx={{ fontWeight: 950 }}>
          No deadline
        </Typography>
      </Box>
    );
  }

  const data = computeIssueDeadlineProgress(issue);
  const progress = data?.progress ?? 0;
  const daysLeft = data?.daysLeft;
  const label = data?.label || issue?.closureDate || "—";
  const barColor = getIssueDeadlineColorByProgress(theme, progress);

  const tooltip =
    typeof daysLeft === "number"
      ? `${label} • ${daysLeft <= 0 ? "Expired" : `${daysLeft} day(s) left`}`
      : String(label);

  return (
    <Tooltip title={tooltip} placement="top" arrow>
      <Box sx={{ mt: 0.9 }}>
        <Stack
          direction="row"
          spacing={0.8}
          sx={{ alignItems: "center", mb: 0.6 }}
        >
          <CalendarMonthIcon
            sx={{ fontSize: 16, color: alpha(theme.palette.common.white, 0.72) }}
          />

          <Typography
            variant="caption"
            sx={{
              fontWeight: 950,
              color: alpha(theme.palette.common.white, 0.82),
            }}
          >
            {label}
          </Typography>

          <Box sx={{ flex: 1 }} />

          {typeof daysLeft === "number" ? (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 950,
                color: alpha(theme.palette.common.white, 0.72),
              }}
            >
              {daysLeft <= 0 ? "Expired" : `${daysLeft}d`}
            </Typography>
          ) : null}
        </Stack>

        <Box
          sx={{
            height: 9,
            borderRadius: 999,
            bgcolor: alpha(theme.palette.common.white, 0.08),
            border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              height: "100%",
              width: `${Math.round(progress * 100)}%`,
              bgcolor: barColor,
              boxShadow: `0 0 18px ${alpha(barColor, 0.25)}`,
              transition: "width 220ms ease, background 220ms ease",
            }}
          />
        </Box>
      </Box>
    </Tooltip>
  );
};

export default IssueDeadlineBar;