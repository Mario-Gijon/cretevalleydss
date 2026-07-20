import { Box, Stack, Typography } from "@mui/material";

import { rankingListViewportSx, rankingRowSx, rankingScoreTrackSx } from "../resultsAnalysis.styles.js";
import { buildScoreBarGeometry } from "../logic/buildScoreBarGeometry.js";

const RankingList = ({ ranking, compact = false, showDescriptions = false }) => {
  const numericScores = ranking
    .map((entry) => entry.score)
    .filter((score) => typeof score === "number" && Number.isFinite(score));
  const domainMin = numericScores.length ? Math.min(0, ...numericScores) : 0;
  const domainMax = numericScores.length ? Math.max(0, ...numericScores) : 0;

  return (
    <Box sx={rankingListViewportSx(compact)}>
      <Stack spacing={0.8}>
        {ranking.map((entry) => {
          const winner = entry.position === 1;
          const scoreBarGeometry = buildScoreBarGeometry({
            score: entry.score,
            domainMin,
            domainMax,
          });

          return (
            <Box key={entry.id} sx={rankingRowSx(winner, compact)}>
              <Box
                sx={{
                  width: compact ? 34 : 42,
                  height: compact ? 34 : 42,
                  flex: "0 0 auto",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid",
                  borderColor: winner ? "success.main" : "secondary.main",
                  color: winner ? "success.light" : "secondary.light",
                  typography: "body2",
                  fontWeight: "fontWeightBold",
                }}
              >
                {entry.position}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  noWrap
                  title={entry.name}
                  sx={{
                    minWidth: 0,
                    display: "block",
                    fontWeight: "fontWeightBold",
                  }}
                >
                  {entry.name}
                </Typography>
                {showDescriptions && entry.description ? (
                  <Typography
                    variant="caption"
                    title={entry.description}
                    sx={{
                      color: "text.secondary",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.description}
                  </Typography>
                ) : null}
                <Box
                  sx={{ ...rankingScoreTrackSx(compact), position: "relative" }}
                  data-score-zero-percent={scoreBarGeometry.zeroPercent}
                  data-score-bar-width={scoreBarGeometry.widthPercent}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      left: `${scoreBarGeometry.leftPercent}%`,
                      width: `${scoreBarGeometry.widthPercent}%`,
                      height: "100%",
                      borderRadius: 99,
                      bgcolor: winner ? "success.main" : "secondary.main",
                    }}
                  />
                  {scoreBarGeometry.showZeroMarker ? (
                    <Box
                      aria-hidden="true"
                      sx={{
                        position: "absolute",
                        left: `${scoreBarGeometry.zeroPercent}%`,
                        top: 0,
                        width: 1,
                        height: "100%",
                        bgcolor: "rgba(255,255,255,0.42)",
                        transform: "translateX(-0.5px)",
                      }}
                    />
                  ) : null}
                </Box>
              </Box>
              <Box sx={{ textAlign: "right", flex: "0 0 auto" }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: winner ? "success.light" : "secondary.light",
                    fontWeight: "fontWeightBold",
                  }}
                >
                  {entry.formattedScore}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default RankingList;
