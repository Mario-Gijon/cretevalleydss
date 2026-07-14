import { List } from "@mui/material";

import { SummaryAccordionRow } from "../../../shared/components/FinishedIssueDialogPrimitives";
import CriterionItem from "./CriterionItem";
import { summaryListSx } from "../summary.styles";

const CriteriaSection = ({ criteria, expanded, onToggle }) => {
  if (!criteria.length) return null;

  return (
    <SummaryAccordionRow label="Criteria" open={expanded} onToggle={onToggle}>
      <List disablePadding sx={summaryListSx}>
        {criteria.map((criterion, index) => <CriterionItem key={criterion?.id || criterion?._id || index} criterion={criterion} isChild={false} />)}
      </List>
    </SummaryAccordionRow>
  );
};

export default CriteriaSection;
