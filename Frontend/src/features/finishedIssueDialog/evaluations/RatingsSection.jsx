import { Box, Divider, FormControl, InputLabel, MenuItem, Select, Stack, ToggleButton, Typography } from "@mui/material";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import { SectionCard } from "../shared/components/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import EvaluationStructureRenderer from "../../issueEvaluation/components/EvaluationStructureRenderer";
import UnsupportedEvaluationStructureAlert from "./components/UnsupportedEvaluationStructureAlert";

const STAGE_LABELS = {
  criteriaWeighting: "Criteria weighting",
  alternativeEvaluation: "Alternative evaluation",
};

const RatingsSection = () => {
  const { ratingsSection } = useFinishedIssueDialogContext();
  const data = ratingsSection;

  if (data.empty) {
    return <SectionCard title="Experts ratings" icon={<AnalyticsIcon fontSize="small" />}><Typography color="text.secondary">No evaluations are available for this issue.</Typography></SectionCard>;
  }

  if (!data.renderer?.structureKey) {
    return <SectionCard title="Experts ratings" icon={<AnalyticsIcon fontSize="small" />}><UnsupportedEvaluationStructureAlert /></SectionCard>;
  }

  return (
    <SectionCard title="Experts ratings" icon={<AnalyticsIcon fontSize="small" />}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Stage</InputLabel>
            <Select value={data.selectedStage} label="Stage" onChange={(event) => data.setSelectedStage(event.target.value)}>
              {data.availableStages.map((stage) => <MenuItem key={stage} value={stage}>{STAGE_LABELS[stage] || stage}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Phase</InputLabel>
            <Select value={data.selectedPhase ?? ""} label="Phase" onChange={(event) => data.setSelectedPhase(Number(event.target.value))}>
              {data.availablePhases.map((phase) => <MenuItem key={phase} value={phase}>Phase {phase}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel>Expert</InputLabel>
            <Select value={data.selectedExpertId ?? ""} label="Expert" onChange={(event) => data.setSelectedExpertId(event.target.value)}>
              {data.expertOptions.map((expert) => <MenuItem key={expert.id} value={expert.id}>{expert.label}</MenuItem>)}
            </Select>
          </FormControl>
          {data.canShowCollective ? <ToggleButton selected={data.showCollective} onChange={() => data.setShowCollective(!data.showCollective)} color="secondary">{data.showCollective ? "Hide collective" : "Show collective"}</ToggleButton> : null}
        </Stack>
        <Divider sx={{ opacity: 0.14 }} />
        {data.individual ? <Typography variant="caption" color="text.secondary">Submitted: {data.individual.submittedAt || "not submitted"} · Completed: {data.individual.completed ? "yes" : "no"}</Typography> : <Typography variant="body2" color="text.secondary">The selected participant has no completed evaluation.</Typography>}
        {data.selectedParticipant ? <Typography variant="caption" color="text.secondary">Current participant weight: {data.selectedParticipant.currentWeight ?? "—"} · Phase snapshot: {data.expertWeightSnapshot.find((entry) => entry.expertId === data.selectedExpertId)?.weight ?? "—"}</Typography> : null}
        <Box sx={{ width: "100%", minWidth: 0 }}>
          <EvaluationStructureRenderer
            stage={data.renderer.stage}
            structureKey={data.renderer.structureKey}
            evaluationContext={data.renderer.evaluationContext}
            backendPayload={data.renderer.backendPayload}
            collectivePayload={data.showCollective ? data.renderer.collectivePayload : null}
            readOnly
          />
        </Box>
      </Stack>
    </SectionCard>
  );
};

export default RatingsSection;
