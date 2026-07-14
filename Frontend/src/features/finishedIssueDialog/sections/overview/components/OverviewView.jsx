import { Box, Stack } from "@mui/material";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

import { SectionCard } from "../../../shared/components/FinishedIssueDialogPrimitives";
import { overviewDetailsGridSx, overviewExpertsGridSx } from "../overview.styles";
import AlternativesSection from "./AlternativesSection";
import ConsensusConfiguration from "./ConsensusConfiguration";
import CriteriaSection from "./CriteriaSection";
import DescriptionSection from "./DescriptionSection";
import ExpertsSection from "./ExpertsSection";
import GeneralInformation from "./GeneralInformation";

const OverviewView = ({ data, state, actions }) => (
  <SectionCard title="Overview" icon={<AssignmentTurnedInIcon fontSize="small" />}>
    <Stack spacing={1.4}>
      <GeneralInformation general={data.general} />
      <DescriptionSection description={data.description} expanded={state.descriptionExpanded} onToggle={actions.toggleDescription} />
      <Box sx={overviewDetailsGridSx}>
        <CriteriaSection criteria={data.criteria} expanded={state.criteriaExpanded} onToggle={actions.toggleCriteria} />
        <AlternativesSection alternatives={data.alternatives} expanded={state.alternativesExpanded} onToggle={actions.toggleAlternatives} />
      </Box>
      <Box sx={overviewExpertsGridSx(Boolean(data.consensus))}>
        <ExpertsSection experts={data.experts} expanded={state.expertsExpanded} onToggle={actions.toggleExperts} />
        <ConsensusConfiguration consensus={data.consensus} />
      </Box>
    </Stack>
  </SectionCard>
);

export default OverviewView;
