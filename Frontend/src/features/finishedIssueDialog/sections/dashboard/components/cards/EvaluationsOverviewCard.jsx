import { Box, Stack, Typography } from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";

import { EvaluationStructureRenderer } from "../../../../../issueEvaluation/rendering";
import { dashboardEvaluationViewportSx } from "../../dashboard.styles";
import DashboardInnerPanel from "../DashboardInnerPanel";
import DashboardPreviewCard from "../DashboardPreviewCard";

const EvaluationsOverviewCard = ({ evaluations, onViewEvaluations }) => {
  const renderer = evaluations.renderer || null;
  const count = evaluations.evaluationsCount || 0;
  const countLabel = `${count} ${count === 1 ? "evaluation" : "evaluations"}`;
  return <DashboardPreviewCard icon={<GroupsRoundedIcon fontSize="small" />} title="Evaluations" headerRight={<Typography data-testid="evaluations-count" sx={{ color: "secondary.light", fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 900, whiteSpace: "nowrap" }}>{countLabel}</Typography>} actionLabel="View evaluations" onAction={onViewEvaluations}>
    <Stack spacing={0.65}>
      <Typography sx={{ color: "text.secondary", fontSize: 12.5, fontWeight: 900 }}>Preview</Typography>
      {renderer?.structureKey ? <Box sx={dashboardEvaluationViewportSx}>
        <EvaluationStructureRenderer stage={renderer.stage} structureKey={renderer.structureKey} evaluationContext={renderer.evaluationContext} backendPayload={renderer.backendPayload} collectivePayload={evaluations.showCollective ? renderer.collectivePayload : null} readOnly />
      </Box> : <DashboardInnerPanel><Stack direction="row" spacing={0.8} alignItems="center"><GroupsRoundedIcon sx={{ color: "text.secondary", fontSize: 19 }} /><Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 650 }}>No registered evaluation view is available for this selection.</Typography></Stack></DashboardInnerPanel>}
    </Stack>
  </DashboardPreviewCard>;
};

export default EvaluationsOverviewCard;
