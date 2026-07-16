import { Alert, Box } from "@mui/material";

import {
  evaluationsLowerGridSx,
  evaluationsPluginGridSx,
  evaluationsRootSx,
} from "../evaluations.styles";
import EvaluationParticipationPanel from "./EvaluationParticipationPanel";
import EvaluationPluginPanel from "./EvaluationPluginPanel";
import EvaluationsEvidenceFooter from "./EvaluationsEvidenceFooter";
import EvaluationsHeader from "./EvaluationsHeader";
import ExpressionDomainsPanel from "./ExpressionDomainsPanel";

const EvaluationsView = ({ data, state, actions }) => {
  if (data.empty) {
    return (
      <Alert severity="info">
        No stored evaluations are available for this issue.
      </Alert>
    );
  }

  const bothStages =
    data.criteriaWeighting.available &&
    data.alternativeEvaluation.available;

  return (
    <Box sx={evaluationsRootSx}>
      <EvaluationsHeader
        data={data}
        state={state}
        actions={actions}
      />

      <Box sx={evaluationsPluginGridSx(bothStages)}>
        <EvaluationPluginPanel
          stageData={data.criteriaWeighting}
          selectedExpertId={state.selectedCriteriaExpertId}
          onSelectExpert={actions.setSelectedCriteriaExpertId}
          showCollective={state.showCollective}
        />

        <EvaluationPluginPanel
          stageData={data.alternativeEvaluation}
          selectedExpertId={state.selectedAlternativeExpertId}
          onSelectExpert={actions.setSelectedAlternativeExpertId}
          showCollective={state.showCollective}
          fullWidth={!data.criteriaWeighting.available}
        />
      </Box>

      <Box sx={evaluationsLowerGridSx}>
        <ExpressionDomainsPanel domains={data.domains} />
        <EvaluationParticipationPanel
          participation={data.participation}
          hasCriteriaWeighting={data.criteriaWeighting.available}
        />
      </Box>

      {!data.criteriaWeighting.available &&
      data.alternativeEvaluation.available ? (
        <Alert
          severity="info"
          variant="outlined"
          sx={{ mt: 1.5, fontSize: 12 }}
        >
          No stored criteria-weighting evaluations exist for this issue.
          Alternative evaluation is shown at full width.
        </Alert>
      ) : null}

      <EvaluationsEvidenceFooter evidence={data.evidence} />
    </Box>
  );
};

export default EvaluationsView;
