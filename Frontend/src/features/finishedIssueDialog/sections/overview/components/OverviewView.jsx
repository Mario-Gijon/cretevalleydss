import { Box } from "@mui/material";

import {
  overviewBottomGridSx,
  overviewGridItemSx,
  overviewRootSx,
  overviewTopGridSx,
} from "../overview.styles";
import AlternativesPanel from "./AlternativesPanel";
import ConfigurationDomainsPanel from "./ConfigurationDomainsPanel";
import CriteriaStructurePanel from "./CriteriaStructurePanel";
import IssueInformationPanel from "./IssueInformationPanel";
import OverviewExecutionFooter from "./OverviewExecutionFooter";
import ParticipationPanel from "./ParticipationPanel";

const OverviewView = ({ data }) => (
  <Box sx={overviewRootSx}>
    <Box sx={overviewTopGridSx}>
      <IssueInformationPanel data={data} />
      <AlternativesPanel alternatives={data.alternatives} />
    </Box>

    <Box sx={overviewBottomGridSx}>
      <Box sx={overviewGridItemSx("criteria")}>
        <CriteriaStructurePanel data={data} />
      </Box>
      <Box sx={overviewGridItemSx("participation")}>
        <ParticipationPanel participation={data.participation} />
      </Box>
      <Box sx={overviewGridItemSx("configuration")}>
        <ConfigurationDomainsPanel
          configuration={data.configuration}
        />
      </Box>
    </Box>

    <OverviewExecutionFooter evidence={data.evidence} />
  </Box>
);

export default OverviewView;
