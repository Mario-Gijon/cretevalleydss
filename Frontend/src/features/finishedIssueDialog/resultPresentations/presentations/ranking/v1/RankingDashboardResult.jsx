import { Box, Typography } from "@mui/material";
import {
  firstRankingRowSx,
  rankingBarCellSx,
  rankingBarSx,
  rankingBarTrackSx,
  rankingHeaderSx,
  rankingMarkerSx,
  rankingRowSx,
  rankingViewportSx,
} from "../../../../sections/dashboard/dashboard.styles.js";

const safeToShowScoreBars = (ranking) => (
  ranking.length >= 2 &&
  ranking.every((entry) => Number.isFinite(entry.score) && entry.score >= 0) &&
  ranking[0].score > 0 &&
  ranking.every((entry, index) => index === 0 || ranking[index - 1].score >= entry.score)
);

const RankingDashboardResult = ({ result }) => {
  const ranking = result.ranking;
  const showScoreBars = safeToShowScoreBars(ranking);
  const leaderScore = showScoreBars ? ranking[0].score : null;

  return (
    <Box sx={rankingViewportSx} role="table" aria-label="Final ranking">
      <Box role="row" sx={rankingHeaderSx(showScoreBars)}>
        <Typography role="columnheader" variant="caption" color="text.secondary">#</Typography>
        <Typography role="columnheader" variant="caption" color="text.secondary">Alternative</Typography>
        {showScoreBars && <Box role="columnheader" aria-label="Score visualization" sx={rankingBarCellSx} />}
        <Typography role="columnheader" variant="caption" color="text.secondary" textAlign="right">Score</Typography>
      </Box>
      {ranking.map((entry, index) => (
        <Box key={`${entry.id}-${index}`} role="row" sx={[rankingRowSx(showScoreBars), index === 0 && firstRankingRowSx]}>
          <Box role="cell" sx={rankingMarkerSx(index)}>{entry.position}</Box>
          <Typography role="cell" variant="body2" title={entry.name} sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{entry.name}</Typography>
          {showScoreBars && (
            <Box role="cell" sx={rankingBarCellSx} aria-hidden="true">
              <Box sx={rankingBarTrackSx}>
                <Box sx={rankingBarSx(index, leaderScore > 0 ? (entry.score / leaderScore) * 100 : 0)} />
              </Box>
            </Box>
          )}
          <Typography role="cell" variant="body2" textAlign="right" sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{entry.formattedScore || "—"}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export default RankingDashboardResult;
