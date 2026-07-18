import { Box, Stack, Typography } from "@mui/material";

import { rankingListViewportSx, rankingRowSx } from "../resultsAnalysis.styles.js";

const widthPercent = ({ score, min, max }) => {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  if (max === min) return 100;
  return 12 + ((score - min) / (max - min)) * 88;
};

const RankingList = ({ ranking, compact = false, showDescriptions = false }) => {
  const numericScores = ranking
    .map((entry) => entry.score)
    .filter((score) => typeof score === "number" && Number.isFinite(score));
  const min = numericScores.length ? Math.min(...numericScores) : 0;
  const max = numericScores.length ? Math.max(...numericScores) : 0;

  return (
    <Box sx={rankingListViewportSx(compact)}>
      <Stack spacing={0.8}>
        {ranking.map((entry) => {
          const winner = entry.position === 1;
          const scoreWidth = widthPercent({ score: entry.score, min, max });

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
                  fontSize: compact ? 14 : 17,
                  fontWeight: 950,
                }}
              >
                {entry.position}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  noWrap
                  title={entry.name}
                  sx={{
                    minWidth: 0,
                    display: "block",
                    fontSize: compact ? 14 : 17,
                    fontWeight: 950,
                  }}
                >
                  {entry.name}
                </Typography>
                {showDescriptions && entry.description ? (
                  <Typography
                    title={entry.description}
                    sx={{
                      color: "text.secondary",
                      fontSize: 10.8,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.description}
                  </Typography>
                ) : null}
                <Box
                  sx={{
                    mt: 0.65,
                    height: 5,
                    maxWidth: compact ? 170 : 300,
                    borderRadius: 99,
                    bgcolor: "rgba(255,255,255,0.055)",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: `${scoreWidth}%`,
                      height: "100%",
                      borderRadius: 99,
                      bgcolor: winner ? "success.main" : "secondary.main",
                    }}
                  />
                </Box>
              </Box>
              <Box sx={{ textAlign: "right", flex: "0 0 auto" }}>
                <Typography
                  sx={{
                    color: winner ? "success.light" : "secondary.light",
                    fontSize: compact ? 15 : 20,
                    fontWeight: 950,
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
