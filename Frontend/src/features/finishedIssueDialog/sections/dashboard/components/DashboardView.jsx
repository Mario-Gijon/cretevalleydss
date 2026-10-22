import { Box, Typography } from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
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
  findingsGridSx,
  findingCardSx,
  findingListSx,
  findingHeadlineSx,
  findingBodySx,
  findingTitleSx,
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
  most_favorable_classification: CategoryRoundedIcon,
  closest_boundary: CompareArrowsRoundedIcon,
  classification_separation: InfoOutlinedIcon,
  classification_spread: ViewListRoundedIcon,
  least_favorable_classification: CategoryRoundedIcon,
};

const FindingCard = ({ finding }) => {
  const FindingIcon = findingIcons[finding.kind] || BarChartRoundedIcon;
  return (
    <Box sx={findingCardSx(finding.kind)}>
      <FindingIcon className="finding-icon" sx={{ fontSize: 21 }} aria-hidden="true" />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={findingTitleSx(finding.kind)}>{finding.title}</Typography>
        {finding.kind === "overview" ? (
          <Box component="ul" sx={findingListSx}>
            {finding.items.map((item, index) => <Box component="li" key={`${index}-${item}`}><Typography variant="body2">{item}</Typography></Box>)}
          </Box>
        ) : (
          <>
            <Typography variant="body1" sx={findingHeadlineSx}>{finding.headline}</Typography>
            <Typography variant="body2" sx={findingBodySx}>{finding.text}</Typography>
            {Array.isArray(finding.alternatives) && finding.alternatives.length > 0 && (
              <Box component="ul" sx={findingListSx}>
                {finding.alternatives.map((alternative) => <Box component="li" key={alternative.id}><Typography variant="body2">{alternative.name}</Typography></Box>)}
              </Box>
            )}
            {Array.isArray(finding.boundaryPairs) && finding.boundaryPairs.length > 0 && (
              <Box component="ul" sx={findingListSx}>
                {finding.boundaryPairs.map(({ label }) => <Box component="li" key={label}><Typography variant="body2">{label}</Typography></Box>)}
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

const DashboardView = ({ data }) => {
  const ResultComponent = data.resultPresentation?.DashboardResultComponent;
  const ResultHeaderIcon = data.resultPresentation?.ResultHeaderIconComponent || ViewListRoundedIcon;

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
          <Box sx={summaryHeaderIconSx("gold")}><ResultHeaderIcon sx={{ fontSize: 18 }} /></Box>
          <Typography id="final-result-title" variant="h6" sx={sectionTitleSx}>Final result</Typography>
        </Box>
        {data.result.available && ResultComponent ? (
          <ResultComponent result={data.result} />
        ) : (
          <Typography variant="body2" color="text.secondary">{data.result.unavailableReason || "No final result is available."}</Typography>
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
