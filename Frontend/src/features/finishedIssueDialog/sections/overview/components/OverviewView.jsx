import { Box } from "@mui/material";

import { issueInfoColumnsSx, overviewRootSx } from "../overview.styles";
import AlternativesPanel from "./AlternativesPanel";
import CriteriaStructurePanel from "./CriteriaStructurePanel";
import IssueInformationPanel from "./IssueInformationPanel";
import ParticipationPanel from "./ParticipationPanel";

const OverviewView = ({ data }) => (
  <Box sx={overviewRootSx}>
    <IssueInformationPanel data={data} />
    <Box sx={issueInfoColumnsSx}>
      <AlternativesPanel alternatives={data.alternatives} />
      <CriteriaStructurePanel data={data} />
    </Box>
    <ParticipationPanel
      participation={data.expertParticipation || { rows: [] }}
      participationSummary={data.participation}
    />
  </Box>
);

export default OverviewView;
