import { Alert, Box, Divider } from "@mui/material";

import {
  evaluationsLowerGridSx,
  evaluationsPluginGridSx,
  evaluationsRootSx,
  evaluationsStageDividerNarrowSx,
  evaluationsStageDividerWideSx,
  evaluationsWorkspaceSx,
} from "../evaluations.styles";
import EvaluationPluginPanel from "./EvaluationPluginPanel";
import EvaluationsEvidenceFooter from "./EvaluationsEvidenceFooter";
import EvaluationsHeader from "./EvaluationsHeader";
import ExpressionDomainsPanel from "./ExpressionDomainsPanel";

const EvaluationsView = ({ data, state, actions, collectiveResolutionStatus }) => {
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
      <Box sx={evaluationsWorkspaceSx} data-testid="evaluations-workspace">
        <EvaluationsHeader
          data={data}
          state={state}
          actions={actions}
        />

        <Box sx={evaluationsPluginGridSx(bothStages)}>
          <EvaluationPluginPanel
            stageData={data.criteriaWeighting}
            showCollective={state.showCollective}
            expertName={data.selectedExpertName}
            consensusEnabled={data.consensus.enabled}
          />

          {bothStages ? (
            <>
              <Divider
                orientation="vertical"
                flexItem
                aria-hidden="true"
                data-testid="evaluations-stage-divider-wide"
                sx={evaluationsStageDividerWideSx}
              />
              <Divider
                aria-hidden="true"
                data-testid="evaluations-stage-divider-narrow"
                sx={evaluationsStageDividerNarrowSx}
              />
            </>
          ) : null}

          <EvaluationPluginPanel
            stageData={data.alternativeEvaluation}
            showCollective={state.showCollective}
            expertName={data.selectedExpertName}
            consensusEnabled={data.consensus.enabled}
            collectiveResolutionStatus={collectiveResolutionStatus}
          />
        </Box>
      </Box>

      <Box sx={evaluationsLowerGridSx}>
        <ExpressionDomainsPanel domains={data.domains} />
      </Box>

      <EvaluationsEvidenceFooter evidence={data.evidence} />
    </Box>
  );
};

export default EvaluationsView;
