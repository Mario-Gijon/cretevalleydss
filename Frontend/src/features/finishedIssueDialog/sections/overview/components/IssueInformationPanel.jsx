import { Box, Chip, Stack, Typography } from "@mui/material";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SubjectRoundedIcon from "@mui/icons-material/SubjectRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import {
  overviewInformationIconSx,
  overviewInformationRowSx,
  overviewIssueRowsSx,
} from "../overview.styles";
import OverviewPanel from "./OverviewPanel";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

const InformationRow = ({
  icon,
  label,
  value,
  secondary,
  tone,
  valueNode,
}) => (
  <Box sx={overviewInformationRowSx}>
    <Box sx={overviewInformationIconSx(tone)}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>
      {valueNode || (
        <Typography
          variant="body2"
          noWrap
          title={String(value)}
          sx={{
            mt: 0.15,
            fontWeight: "fontWeightBold",
          }}
        >
          {value}
        </Typography>
      )}
      {secondary ? (
        <Typography
          variant="caption"
          noWrap
          title={secondary}
          sx={{
            mt: 0.1,
            color: "text.secondary",
          }}
        >
          {secondary}
        </Typography>
      ) : null}
    </Box>
  </Box>
);

const IssueInformationPanel = ({ data }) => {
  const finished = data.issue.lifecycle?.active === false;
  const weighting = data.configuration.criteriaWeighting;
  const weightingValue = weighting.required
    ? weighting.modelName || weighting.sourceLabel || weighting.structureLabel || "—"
    : "Not required";
  const weightingLevel = weighting.required
    ? ({ parent: "Parent criteria", leaf: "Leaf criteria" }[weighting.level] || null)
    : null;

  return (
    <OverviewPanel
      title="Issue information"
      icon={<DescriptionRoundedIcon fontSize="small" />}
    >
      <Stack spacing={1}>
          <Box sx={overviewIssueRowsSx}>
            <InformationRow
              icon={<SubjectRoundedIcon fontSize="small" />}
              label="Name"
              value={data.issue.name || "—"}
            />
            <InformationRow
              icon={<PersonRoundedIcon fontSize="small" />}
              label="Owner"
              value={
                data.issue.owner?.name ||
                data.issue.owner?.email ||
                "—"
              }
              secondary={data.issue.owner?.email || null}
            />
            <InformationRow
              icon={<LayersRoundedIcon fontSize="small" />}
              label="Model"
              value={data.configuration.baseModel.name || "—"}
            />
            <InformationRow
              icon={<AssignmentTurnedInRoundedIcon fontSize="small" />}
              label="Consensus"
              value={data.configuration.consensus.enabled ? "Enabled" : "Disabled"}
            />
            <InformationRow
              icon={<HubRoundedIcon fontSize="small" />}
              label="Alternative evaluation"
              value={data.configuration.alternativeEvaluation.structureLabel || "—"}
            />
            <InformationRow
              icon={<TuneRoundedIcon fontSize="small" />}
              label="Criteria weighting"
              value={weightingValue}
            />
            {weightingLevel ? (
              <InformationRow
                icon={<AccountTreeRoundedIcon fontSize="small" />}
                label="Weighting level"
                value={weightingLevel}
              />
            ) : null}
            <InformationRow
              icon={<AccountTreeRoundedIcon fontSize="small" />}
              label="Domain assignments"
              value={`${data.configuration.assignedDomainCriteriaCount} criteria`}
            />
            <InformationRow
              icon={<CalendarMonthRoundedIcon fontSize="small" />}
              label="Creation date"
              value={formatDate(data.general.creationDate)}
            />
            <InformationRow
              icon={<CheckCircleRoundedIcon fontSize="small" />}
              label="Status"
              tone={finished ? "green" : "cyan"}
              valueNode={
                <Chip
                  size="small"
                  color={finished ? "success" : "secondary"}
                  variant="outlined"
                  icon={
                    finished ? (
                      <CheckCircleRoundedIcon />
                    ) : undefined
                  }
                  label={finished ? "Finished" : "Active"}
                  sx={{
                    mt: 0.25,
                    ml:2,
                    height: 24,
                    fontWeight: "fontWeightBold",
                  }}
                />
              }
            />
          </Box>

          <Box
            sx={{
              pt: 1,
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Stack direction="row" spacing={0.8} alignItems="flex-start">
              <Box sx={overviewInformationIconSx()}>
                <SubjectRoundedIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: "fontWeightMedium",
                  }}
                >
                  Description
                </Typography>
                <Typography variant="body2"
                  sx={{
                    mt: 0.4,
                    color: data.description
                      ? "text.primary"
                      : "text.secondary",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    lineHeight: 1.55,
                  }}
                >
                  {data.description || "No description was provided."}
                </Typography>
              </Box>
            </Stack>
          </Box>
      </Stack>
    </OverviewPanel>
  );
};

export default IssueInformationPanel;
