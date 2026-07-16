import { Stack, Typography } from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";

import { overviewCriteriaViewportSx } from "../overview.styles";
import CriteriaTreeNode from "./CriteriaTreeNode";
import OverviewPanel from "./OverviewPanel";

const CriteriaStructurePanel = ({ data }) => (
  <OverviewPanel
    title="Criteria structure"
    icon={<AccountTreeRoundedIcon fontSize="small" />}
    count={`${data.counts.criteria} total · ${data.counts.leafCriteria} leaf`}
  >
    {data.criteria.length ? (
      <Stack data-testid="overview-criteria-viewport" sx={overviewCriteriaViewportSx}>
        {data.criteria.map((criterion) => (
          <CriteriaTreeNode
            key={criterion.id}
            criterion={criterion}
          />
        ))}
      </Stack>
    ) : (
      <Typography color="text.secondary">
        No criteria are available.
      </Typography>
    )}
  </OverviewPanel>
);

export default CriteriaStructurePanel;
