import { Box, Typography } from "@mui/material";
import { dashboardRootSx, issueSummaryGridSx, summaryValueSx, sectionTitleSx, rankingViewportSx, rankingHeaderSx, rankingRowSx, firstRankingRowSx, findingsGridSx, findingSx } from "../dashboard.styles.js";

const SummaryValue = ({ label, value }) => (
  <Box sx={summaryValueSx}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body1" sx={{ mt: 0.3, minWidth: 0, overflowWrap: "anywhere" }}>{value}</Typography>
  </Box>
);

const DashboardView = ({ data }) => (
  <Box sx={dashboardRootSx}>
    <Box component="section" aria-labelledby="issue-summary-title" sx={{ minWidth: 0 }}>
      <Typography id="issue-summary-title" variant="h6" sx={sectionTitleSx}>Issue summary</Typography>
      <Box sx={issueSummaryGridSx}>
        <SummaryValue label="Alternatives" value={data.issueSummary.alternativesCount} />
        <SummaryValue label="Criteria" value={data.issueSummary.criteriaCount} />
        <SummaryValue label="Experts" value={data.issueSummary.expertsCount} />
        <SummaryValue label="Evaluation model" value={data.issueSummary.modelName} />
      </Box>
    </Box>

    <Box component="section" aria-labelledby="final-result-title" sx={{ minWidth: 0 }}>
      <Typography id="final-result-title" variant="h6" sx={sectionTitleSx}>Final result</Typography>
      {data.result.available ? (
        <Box sx={rankingViewportSx} role="table" aria-label="Final ranking">
          <Box role="row" sx={rankingHeaderSx}>
            <Typography role="columnheader" variant="caption" color="text.secondary">#</Typography>
            <Typography role="columnheader" variant="caption" color="text.secondary">Alternative</Typography>
            <Typography role="columnheader" variant="caption" color="text.secondary" textAlign="right">Score</Typography>
          </Box>
          {data.result.ranking.map((entry, index) => (
            <Box key={`${entry.id}-${index}`} role="row" sx={[rankingRowSx, index === 0 && firstRankingRowSx]}>
              <Typography role="cell" variant="body2" color={index === 0 ? "secondary.light" : "text.secondary"}>{entry.position}</Typography>
              <Typography role="cell" variant="body2" title={entry.name} sx={{ minWidth: 0, overflowWrap: "anywhere" }}>{entry.name}</Typography>
              <Typography role="cell" variant="body2" textAlign="right" sx={{ whiteSpace: "nowrap" }}>{entry.formattedScore || "—"}</Typography>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">No final result is available.</Typography>
      )}
    </Box>

    {data.findings.length > 0 && (
      <Box component="section" aria-labelledby="key-findings-title" sx={{ minWidth: 0 }}>
        <Typography id="key-findings-title" variant="h6" sx={sectionTitleSx}>Key findings</Typography>
        <Box sx={findingsGridSx}>
          {data.findings.map((finding) => (
            <Box key={finding.title} sx={findingSx}>
              <Typography variant="subtitle2">{finding.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>{finding.text}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    )}
  </Box>
);

export default DashboardView;
