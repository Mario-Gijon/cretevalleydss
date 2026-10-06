import { Box, Typography } from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import {
  dashboardRootSx,
  issueSummaryGridSx,
  summaryValueSx,
  summaryValueIconSx,
  sectionTitleSx,
  summaryPanelSx,
  summaryPanelHeaderSx,
  summaryHeaderIconSx,
  rankingViewportSx,
  rankingHeaderSx,
  rankingRowSx,
  firstRankingRowSx,
  rankingMarkerSx,
  rankingBarTrackSx,
  rankingBarSx,
  rankingBarCellSx,
  findingsGridSx,
  findingCardSx,
} from "../dashboard.styles.js";

const SummaryValue = ({ icon, label, value }) => (
  <Box sx={summaryValueSx}>
    <Box sx={summaryValueIconSx} aria-hidden="true">{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body1" sx={{ mt: 0.2, minWidth: 0, fontWeight: 500, overflowWrap: "break-word" }}>{value}</Typography>
    </Box>
  </Box>
);

const findingIcons = {
  winner: EmojiEventsRoundedIcon,
  gap: BarChartRoundedIcon,
  last: TrendingDownRoundedIcon,
};

const FindingCard = ({ finding }) => {
  const FindingIcon = findingIcons[finding.kind] || BarChartRoundedIcon;
  return (
    <Box sx={findingCardSx(finding.kind)}>
      <FindingIcon className="finding-icon" sx={{ fontSize: 21 }} aria-hidden="true" />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2">{finding.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45, overflowWrap: "break-word" }}>{finding.text}</Typography>
      </Box>
    </Box>
  );
};

const safeToShowScoreBars = (ranking) => (
  ranking.length >= 2 &&
  ranking.every((entry) => Number.isFinite(entry.score) && entry.score >= 0) &&
  ranking[0].score > 0 &&
  ranking.every((entry, index) => index === 0 || ranking[index - 1].score >= entry.score)
);

const DashboardView = ({ data }) => {
  const ranking = data.result.ranking;
  const showScoreBars = data.result.available && safeToShowScoreBars(ranking);
  const leaderScore = showScoreBars ? ranking[0].score : null;

  return (
    <Box sx={dashboardRootSx}>
      <Box component="section" aria-labelledby="issue-summary-title" sx={summaryPanelSx}>
        <Box sx={summaryPanelHeaderSx}>
          <Box sx={summaryHeaderIconSx()}><InfoOutlinedIcon sx={{ fontSize: 18 }} /></Box>
          <Typography id="issue-summary-title" variant="h6" sx={sectionTitleSx}>Issue summary</Typography>
        </Box>
        <Box sx={issueSummaryGridSx}>
          <SummaryValue icon={<ViewListRoundedIcon sx={{ fontSize: 18 }} />} label="Alternatives" value={data.issueSummary.alternativesCount} />
          <SummaryValue icon={<AccountTreeRoundedIcon sx={{ fontSize: 18 }} />} label="Criteria" value={data.issueSummary.criteriaCount} />
          <SummaryValue icon={<GroupsRoundedIcon sx={{ fontSize: 18 }} />} label="Experts" value={data.issueSummary.expertsCount} />
          <SummaryValue icon={<TuneRoundedIcon sx={{ fontSize: 18 }} />} label="Evaluation model" value={data.issueSummary.modelName} />
        </Box>
      </Box>

      <Box component="section" aria-labelledby="final-result-title" sx={summaryPanelSx}>
        <Box sx={summaryPanelHeaderSx}>
          <Box sx={summaryHeaderIconSx("gold")}><EmojiEventsRoundedIcon sx={{ fontSize: 18 }} /></Box>
          <Typography id="final-result-title" variant="h6" sx={sectionTitleSx}>Final result</Typography>
        </Box>
        {data.result.available ? (
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
        ) : (
          <Typography variant="body2" color="text.secondary">No final result is available.</Typography>
        )}
      </Box>

      {data.findings.length > 0 && (
        <Box component="section" aria-labelledby="key-findings-title" sx={summaryPanelSx}>
          <Box sx={summaryPanelHeaderSx}>
            <Box sx={summaryHeaderIconSx("gold")}><LightbulbRoundedIcon sx={{ fontSize: 18 }} /></Box>
            <Typography id="key-findings-title" variant="h6" sx={sectionTitleSx}>Key findings</Typography>
          </Box>
          <Box sx={findingsGridSx}>
            {data.findings.map((finding) => <FindingCard key={finding.kind} finding={finding} />)}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DashboardView;
