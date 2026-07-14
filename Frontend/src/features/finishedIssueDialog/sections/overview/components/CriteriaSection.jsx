import { List } from "@mui/material";

import { SummaryAccordionRow } from "../../../shared/components/FinishedIssueDialogPrimitives";
import CriterionItem from "./CriterionItem";
import { overviewListSx } from "../overview.styles";

const CriteriaSection = ({ criteria, expanded, onToggle }) => {
  if (!criteria.length) return null;

  return (
    <SummaryAccordionRow label="Criteria" open={expanded} onToggle={onToggle}>
      <List disablePadding sx={overviewListSx}>
        {criteria.map((criterion, index) => <CriterionItem key={criterion?.id || criterion?._id || index} criterion={criterion} isChild={false} />)}
      </List>
    </SummaryAccordionRow>
  );
};

export default CriteriaSection;
