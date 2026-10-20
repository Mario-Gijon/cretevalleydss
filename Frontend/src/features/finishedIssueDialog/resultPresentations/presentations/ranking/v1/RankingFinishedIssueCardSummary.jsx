import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import { getFinishedTopAlternativesWidgetSx } from "../../../../../finishedIssues/styles/finishedIssues.styles.js";

const RankingFinishedIssueCardSummary = ({ issue }) => {
  const theme = useTheme();
  const alternatives = Array.isArray(issue?.topAlternatives) ? issue.topAlternatives.slice(0, 3) : [];

  return (
    <Box component="section" aria-label="Top alternatives" sx={getFinishedTopAlternativesWidgetSx()}>
      <Stack direction="row" spacing={0.55} alignItems="center" sx={{ mb: 0.6, pl: 0.1 }}>
        <EmojiEventsOutlinedIcon sx={{ fontSize: 15, color: alpha(theme.palette.success.light, 0.78) }} />
        <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.62), fontWeight: 950, letterSpacing: 0.35, textTransform: "uppercase" }}>
          Top alternatives
        </Typography>
      </Stack>

      {alternatives.length ? (
        <Stack component="ol" role="list" spacing={{ xs: 0.48, sm: 0.62 }} sx={{ m: 0, p: 0, listStyle: "none" }}>
          {alternatives.map((alternative, index) => {
            const rank = Number.isFinite(Number(alternative?.rank)) ? Number(alternative.rank) : index + 1;
            const name = alternative?.name || "Unnamed alternative";
            const isFirst = rank === 1;
            const isSecond = rank === 2;
            return (
              <Box component="li" role="listitem" key={`${alternative?.alternativeId || name}-${rank}`}>
                <Stack direction="row" spacing={0.65} alignItems="baseline">
                  <Typography variant="caption" sx={{
                    flex: "0 0 auto", minWidth: 20, px: 0.35, py: 0.08, borderRadius: 1,
                    bgcolor: isFirst ? alpha(theme.palette.success.main, 0.13) : isSecond ? alpha(theme.palette.common.white, 0.045) : "transparent",
                    color: isFirst ? alpha(theme.palette.success.light, 0.96) : isSecond ? alpha(theme.palette.common.white, 0.68) : alpha(theme.palette.common.white, 0.52),
                    fontWeight: 950, textAlign: "center",
                  }}>
                    #{rank}
                  </Typography>
                  <Typography variant="caption" noWrap sx={{ minWidth: 0, flex: 1, color: alpha(theme.palette.common.white, isFirst ? 0.94 : 0.76), fontWeight: isFirst ? 900 : 800 }}>
                    {name}
                  </Typography>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Stack direction="row" alignItems="center" spacing={0.65} sx={{ minHeight: 20, pl: 0.1, color: alpha(theme.palette.common.white, 0.46) }}>
          <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: alpha(theme.palette.common.white, 0.34) }} />
          <Typography variant="caption" sx={{ fontWeight: 800 }}>Ranking unavailable</Typography>
        </Stack>
      )}
    </Box>
  );
};

export default RankingFinishedIssueCardSummary;
