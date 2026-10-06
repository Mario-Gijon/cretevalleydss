import { Box, Typography } from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import {
  issueDescriptionItemSx,
  issueInformationGridSx,
  overviewInformationIconSx,
  overviewInformationRowSx,
} from "../overview.styles";
import OverviewPanel from "./OverviewPanel";

const issueDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const formatIssueDate = (value) => {
  if (!value) return "—";
  let date;

  if (typeof value === "string") {
    const dayFirst = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    const isoDateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dayFirst) {
      date = new Date(Number(dayFirst[3]), Number(dayFirst[2]) - 1, Number(dayFirst[1]));
      if (date.getDate() !== Number(dayFirst[1]) || date.getMonth() !== Number(dayFirst[2]) - 1) return String(value);
    } else if (isoDateOnly) {
      date = new Date(Number(isoDateOnly[1]), Number(isoDateOnly[2]) - 1, Number(isoDateOnly[3]));
      if (date.getDate() !== Number(isoDateOnly[3]) || date.getMonth() !== Number(isoDateOnly[2]) - 1) return String(value);
    } else {
      date = new Date(value);
    }
  } else {
    date = new Date(value);
  }

  return Number.isNaN(date.getTime()) ? String(value) : issueDateFormatter.format(date);
};

const InformationRow = ({ icon, label, value }) => (
  <Box sx={overviewInformationRowSx}>
    <Box sx={overviewInformationIconSx()}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" noWrap title={String(value)} sx={{ mt: 0.15, fontWeight: "fontWeightBold" }}>
        {value}
      </Typography>
    </Box>
  </Box>
);

const IssueInformationPanel = ({ data }) => {
  const weighting = data.configuration.criteriaWeighting;
  const weightingValue = weighting.required
    ? weighting.modelName || weighting.sourceLabel || weighting.structureLabel || "—"
    : "Not required";
  const weightingLevel = weighting.required
    ? ({ parent: "Parent criteria", leaf: "Leaf criteria" }[weighting.level] || "—")
    : "Not required";

  return (
    <OverviewPanel title="Issue information" icon={<DescriptionRoundedIcon fontSize="small" />}>
      <Box sx={issueInformationGridSx}>
        <InformationRow icon={<LayersRoundedIcon fontSize="small" />} label="Evaluation model" value={data.configuration.baseModel.name || "—"} />
        <InformationRow icon={<HubRoundedIcon fontSize="small" />} label="Alternative evaluation" value={data.configuration.alternativeEvaluation.structureLabel || "—"} />
        <InformationRow icon={<TuneRoundedIcon fontSize="small" />} label="Criteria weighting" value={weightingValue} />
        <InformationRow icon={<AccountTreeRoundedIcon fontSize="small" />} label="Weighting level" value={weightingLevel} />
        <InformationRow icon={<CalendarMonthRoundedIcon fontSize="small" />} label="Created" value={formatIssueDate(data.general.creationDate)} />
        <InformationRow icon={<CalendarMonthRoundedIcon fontSize="small" />} label="Finalized" value={formatIssueDate(data.general.finishedAt)} />
      </Box>
      <Box data-testid="issue-description-item" sx={issueDescriptionItemSx}>
        <Box sx={{ ...overviewInformationIconSx(), mt: 0.1 }}><DescriptionRoundedIcon fontSize="small" /></Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">Description</Typography>
          <Typography variant="body2" sx={{ mt: 0.15, color: data.description ? "text.primary" : "text.secondary", whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.5 }}>
            {data.description || "No description was provided."}
          </Typography>
        </Box>
      </Box>
    </OverviewPanel>
  );
};

export default IssueInformationPanel;
