import { Box, Stack, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";

import EvaluationStructureRenderer from "../../../../../issueEvaluation/components/EvaluationStructureRenderer";
import { dashboardEvaluationViewportSx } from "../../dashboard.styles";
import DashboardInnerPanel from "../DashboardInnerPanel";
import DashboardPreviewCard from "../DashboardPreviewCard";

const SummaryCell = ({ label, value, success = false }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ color: "text.secondary", fontSize: 11.5, fontWeight: 700 }}>{label}</Typography>
    <Stack direction="row" spacing={0.45} alignItems="center">
      {success ? <CheckCircleRoundedIcon sx={{ color: "success.main", fontSize: 15 }} /> : null}
      <Typography noWrap title={String(value)} sx={{ mt: 0.15, fontSize: 13, fontWeight: 900 }}>{value}</Typography>
    </Stack>
  </Box>
);

const EvaluationsOverviewCard = ({ evaluations, onViewEvaluations }) => {
  const renderer = evaluations.renderer || null;
  return <DashboardPreviewCard number="3" title="Evaluations" subtitle={evaluations.stageLabel || "Evaluation summary"} actionLabel="View evaluations" onAction={onViewEvaluations}>
    <Stack spacing={1}>
      <DashboardInnerPanel>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1 }}>
          <SummaryCell label="Stage" value={evaluations.stageLabel || "—"} />
          <SummaryCell label="Experts" value={`${evaluations.completedExpertsCount || 0}/${evaluations.expertsCount || 0}`} />
          <SummaryCell label="Collective" value={evaluations.hasCollective ? "Available" : "Not available"} success={evaluations.hasCollective} />
        </Box>
      </DashboardInnerPanel>
      {renderer?.structureKey ? <Box sx={dashboardEvaluationViewportSx}>
        <EvaluationStructureRenderer stage={renderer.stage} structureKey={renderer.structureKey} evaluationContext={renderer.evaluationContext} backendPayload={renderer.backendPayload} collectivePayload={evaluations.showCollective ? renderer.collectivePayload : null} readOnly />
      </Box> : <DashboardInnerPanel><Stack direction="row" spacing={0.8} alignItems="center"><GroupsRoundedIcon sx={{ color: "text.secondary", fontSize: 19 }} /><Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 650 }}>No registered evaluation view is available for this selection.</Typography></Stack></DashboardInnerPanel>}
    </Stack>
  </DashboardPreviewCard>;
};

export default EvaluationsOverviewCard;
