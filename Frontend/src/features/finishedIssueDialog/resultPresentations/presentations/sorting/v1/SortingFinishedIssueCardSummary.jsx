import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import { getFinishedTopAlternativesWidgetSx } from "../../../../../finishedIssues/styles/finishedIssues.styles.js";

const validCount = (value) => Number.isInteger(value) && value >= 0;

const SortingFinishedIssueCardSummary = ({ issue }) => {
  const theme = useTheme();
  const summary = issue?.sortingSummary;
  const available = validCount(summary?.categoryCount) && validCount(summary?.assignedAlternativeCount);

  return (
    <Box component="section" aria-label="Sorting summary" sx={getFinishedTopAlternativesWidgetSx()}>
      <Stack direction="row" spacing={0.55} alignItems="center" sx={{ mb: 0.6, pl: 0.1 }}>
        <CategoryRoundedIcon sx={{ fontSize: 15, color: alpha(theme.palette.secondary.light, 0.85) }} />
        <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.62), fontWeight: 950, letterSpacing: 0.35, textTransform: "uppercase" }}>
          Sorting result
        </Typography>
      </Stack>
      {available ? (
        <Stack spacing={0.35}>
          <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.88), fontWeight: 800 }}>
            {summary.categoryCount} {summary.categoryCount === 1 ? "category" : "categories"}
          </Typography>
          <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.66), fontWeight: 750 }}>
            {summary.assignedAlternativeCount} {summary.assignedAlternativeCount === 1 ? "alternative assigned" : "alternatives assigned"}
          </Typography>
        </Stack>
      ) : (
        <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.5), fontWeight: 800 }}>
          Sorting summary unavailable
        </Typography>
      )}
    </Box>
  );
};

export default SortingFinishedIssueCardSummary;
