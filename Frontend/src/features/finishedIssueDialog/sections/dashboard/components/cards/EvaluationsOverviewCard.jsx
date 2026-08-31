import { Box, Stack, Typography } from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";

import { EvaluationStructureRenderer } from "../../../../../issueEvaluation/rendering";
import { dashboardEvaluationViewportSx } from "../../dashboard.styles";
import DashboardInnerPanel from "../DashboardInnerPanel";
import DashboardPreviewCard from "../DashboardPreviewCard";

const EvaluationsOverviewCard = ({ evaluations, onViewEvaluations }) => {
  const renderer = evaluations.renderer || null;
  const count = evaluations.evaluationsCount || 0;
  const countLabel = `${count} ${count === 1 ? "submission" : "submissions"}`;
  return <DashboardPreviewCard icon={<GroupsRoundedIcon fontSize="small" />} title="Evaluations" headerRight={<Typography variant="body2" data-testid="evaluations-count" sx={{ color: "secondary.light", fontWeight: "fontWeightBold", whiteSpace: "nowrap" }}>{countLabel}</Typography>} actionLabel="View evaluations" onAction={onViewEvaluations}>
    <Stack spacing={0.65}>
      <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>Preview</Typography>
      {renderer?.structureKey ? <Box sx={dashboardEvaluationViewportSx}>
        <EvaluationStructureRenderer stage={renderer.stage} structureKey={renderer.structureKey} decisionContext={renderer.decisionContext} evaluation={renderer.evaluation} collectiveEvaluation={evaluations.showCollective ? renderer.collectiveEvaluation : null} readOnly />
      </Box> : <DashboardInnerPanel><Stack direction="row" spacing={0.8} alignItems="center"><GroupsRoundedIcon sx={{ color: "text.secondary", fontSize: 19 }} /><Typography variant="body2" sx={{ color: "text.secondary" }}>No registered evaluation view is available for this selection.</Typography></Stack></DashboardInnerPanel>}
    </Stack>
  </DashboardPreviewCard>;
};

export default EvaluationsOverviewCard;
