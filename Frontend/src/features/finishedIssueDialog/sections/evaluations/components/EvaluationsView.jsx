import { Box, Divider, FormControl, InputLabel, MenuItem, Select, Stack, ToggleButton, Typography } from "@mui/material";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import { SectionCard } from "../../../shared/components/FinishedIssueDialogPrimitives";
import EvaluationStructureRenderer from "../../../../issueEvaluation/components/EvaluationStructureRenderer";
import { evaluationsControlsSx, evaluationsExpertControlSx, evaluationsPhaseControlSx, evaluationsRendererSx } from "../evaluations.styles.js";
import UnsupportedEvaluationStructureAlert from "./UnsupportedEvaluationStructureAlert.jsx";

const stageLabels = { criteriaWeighting: "Criteria weighting", alternativeEvaluation: "Alternative evaluation" };

const EvaluationsView = ({ data, state, actions }) => {
  if (data.empty) return <SectionCard title="Evaluations" icon={<AnalyticsIcon fontSize="small" />}><Typography color="text.secondary">No evaluations are available for this issue.</Typography></SectionCard>;
  if (!data.renderer?.structureKey) return <SectionCard title="Evaluations" icon={<AnalyticsIcon fontSize="small" />}><UnsupportedEvaluationStructureAlert /></SectionCard>;
  const phaseWeight = data.expertWeightSnapshot.find((entry) => entry.expertId === data.selectedExpertId)?.weight ?? "—";
  return <SectionCard title="Evaluations" icon={<AnalyticsIcon fontSize="small" />}><Stack spacing={2}>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
      <FormControl size="small" sx={evaluationsControlsSx}><InputLabel>Stage</InputLabel><Select value={data.selectedStage} label="Stage" onChange={(event) => actions.setSelectedStage(event.target.value)}>{data.availableStages.map((stage) => <MenuItem key={stage} value={stage}>{stageLabels[stage] || stage}</MenuItem>)}</Select></FormControl>
      <FormControl size="small" sx={evaluationsPhaseControlSx}><InputLabel>Phase</InputLabel><Select value={data.selectedPhase ?? ""} label="Phase" onChange={(event) => actions.setSelectedPhase(Number(event.target.value))}>{data.availablePhases.map((phase) => <MenuItem key={phase} value={phase}>Phase {phase}</MenuItem>)}</Select></FormControl>
      <FormControl size="small" sx={evaluationsExpertControlSx}><InputLabel>Expert</InputLabel><Select value={data.selectedExpertId ?? ""} label="Expert" onChange={(event) => actions.setSelectedExpertId(event.target.value)}>{data.expertOptions.map((expert) => <MenuItem key={expert.id} value={expert.id}>{expert.label}</MenuItem>)}</Select></FormControl>
      {data.canShowCollective ? <ToggleButton selected={state.showCollective} size="small" onChange={() => actions.setShowCollective(!state.showCollective)} color="secondary">{state.showCollective ? "Hide collective" : "Show collective"}</ToggleButton> : null}
    </Stack>
    <Divider sx={{ opacity: 0.14 }} />
    {data.individual ? <Typography variant="caption" color="text.secondary">Submitted: {data.individual.submittedAt || "not submitted"} · Completed: {data.individual.completed ? "yes" : "no"}</Typography> : <Typography variant="body2" color="text.secondary">The selected participant has no completed evaluation.</Typography>}
    {data.selectedParticipant ? <Typography variant="caption" color="text.secondary">Current participant weight: {data.selectedParticipant.currentWeight ?? "—"} · Phase snapshot: {phaseWeight}</Typography> : null}
    <Box sx={evaluationsRendererSx}><EvaluationStructureRenderer stage={data.renderer.stage} structureKey={data.renderer.structureKey} evaluationContext={data.renderer.evaluationContext} backendPayload={data.renderer.backendPayload} collectivePayload={state.showCollective ? data.renderer.collectivePayload : null} readOnly /></Box>
  </Stack></SectionCard>;
};

export default EvaluationsView;
