import { Box, Stack, Typography } from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";

import { EvaluationStructureRenderer } from "../../../../../issueEvaluation/rendering";
import { dashboardEvaluationViewportSx } from "../../dashboard.styles";
import DashboardInnerPanel from "../DashboardInnerPanel";
import DashboardPreviewCard from "../DashboardPreviewCard";

const EvaluationsOverviewCard = ({ evaluations, onViewEvaluations }) => {
  const renderer = evaluations.renderer || null;
  return <DashboardPreviewCard number="4" title="Evaluations" subtitle={evaluations.stageLabel || "Evaluation summary"} actionLabel="View evaluations" onAction={onViewEvaluations}>
    <Stack spacing={1}>
      <DashboardInnerPanel>
        <Typography sx={{ color: "text.secondary", fontSize: 11.5, fontWeight: 700 }}>Evaluations</Typography>
        <Typography sx={{ mt: 0.15, fontSize: 18, fontWeight: 950 }}>{evaluations.evaluationsCount || 0}</Typography>
      </DashboardInnerPanel>
      <Typography sx={{ color: "text.secondary", fontSize: 12, fontWeight: 900 }}>Preview</Typography>
      {renderer?.structureKey ? <Box sx={dashboardEvaluationViewportSx}>
        <EvaluationStructureRenderer stage={renderer.stage} structureKey={renderer.structureKey} evaluationContext={renderer.evaluationContext} backendPayload={renderer.backendPayload} collectivePayload={evaluations.showCollective ? renderer.collectivePayload : null} readOnly />
      </Box> : <DashboardInnerPanel><Stack direction="row" spacing={0.8} alignItems="center"><GroupsRoundedIcon sx={{ color: "text.secondary", fontSize: 19 }} /><Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 650 }}>No registered evaluation view is available for this selection.</Typography></Stack></DashboardInnerPanel>}
    </Stack>
  </DashboardPreviewCard>;
};

export default EvaluationsOverviewCard;
