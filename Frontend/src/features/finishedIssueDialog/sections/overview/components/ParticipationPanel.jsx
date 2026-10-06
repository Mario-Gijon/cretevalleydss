import { useState } from "react";
import {
  Box,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

import {
  issueInfoExpertTableViewportSx,
  issueInfoParticipationGridSx,
  overviewExpertDetailsSx,
  overviewExpertSubmissionBlockSx,
  overviewExpertSubmissionGridSx,
  overviewDataRowSeparator,
  overviewParticipationChartSx,
} from "../overview.styles";
import OverviewPanel from "./OverviewPanel";
import ParticipationDonutChart from "./charts/ParticipationDonutChart";

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const statusForInvitation = (invitation) => {
  if (invitation?.status === "accepted") return { state: "success", label: "Accepted" };
  if (["declined", "removed", "expelled"].includes(invitation?.status)) return { state: "negative", label: invitation.status === "declined" ? "Declined" : "Removed" };
  if (invitation?.status === "pending") return { state: "neutral", label: "Pending" };
  return { state: "neutral", label: "Invitation status unavailable" };
};

const statusForStage = (stage) => {
  if (!stage) return { state: "neutral", label: "Not applicable" };
  if (stage.completed === true) return { state: "success", label: "Completed" };
  if (!Number.isInteger(stage.total)) return { state: "negative", label: "Not submitted" };
  if (stage.total === 0) return { state: "neutral", label: "Not applicable" };
  if (stage.completed >= stage.total) return { state: "success", label: "Completed" };
  if (stage.completed > 0) return { state: "neutral", label: "Partially completed" };
  if (stage.submissions?.length || stage.completed === true) return { state: "negative", label: "Incomplete" };
  return { state: "negative", label: "Not submitted" };
};

const iconForStatus = (state) => {
  if (state === "success") return <CheckCircleRoundedIcon fontSize="small" sx={{ color: "success.light" }} />;
  if (state === "negative") return <CancelRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />;
  return <RemoveRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />;
};

const latestSubmission = (stage) => {
  if (!stage) return null;
  if (Array.isArray(stage.submissions) && stage.submissions.length) {
    return [...stage.submissions].sort((left, right) => {
      const phaseDelta = (right.phase ?? -1) - (left.phase ?? -1);
      if (phaseDelta !== 0) return phaseDelta;
      return new Date(right.submittedAt || 0).getTime() - new Date(left.submittedAt || 0).getTime();
    })[0];
  }
  return stage;
};

const submissionStatusLabel = (stage) => {
  const status = statusForStage(stage).label;
  if (status === "Completed") return "Submitted";
  if (status === "Partially completed") return "Partially submitted";
  return status;
};

const SubmissionDetail = ({ title, status, date }) => (
  <Box sx={overviewExpertSubmissionBlockSx}>
    <Typography variant="caption" sx={{ color: "text.primary", fontWeight: "fontWeightBold" }}>{title}</Typography>
    <Typography variant="caption" display="block" sx={{ mt: 0.2, color: "text.secondary" }}>Status: {status}</Typography>
    <Typography variant="caption" display="block" sx={{ color: "text.secondary" }}>Date: {date || "—"}</Typography>
  </Box>
);

const StageDetail = ({ title, stage }) => {
  const submitted = latestSubmission(stage);
  const date = formatDateTime(submitted?.submittedAt);
  return (
    <SubmissionDetail title={title} status={submissionStatusLabel(stage)} date={date} />
  );
};

const eventLabel = (event, rejoined = false) => {
  const stage = event.stage === "criteriaWeighting"
    ? "criteria weighting"
    : event.stage === "alternativeEvaluation"
      ? "alternative evaluation"
      : null;
  const phase = Number.isInteger(event.phase) && event.phase > 0 ? ` · Round ${event.phase}` : "";
  switch (event.type) {
    case "invitationAccepted": return "Invitation accepted";
    case "invitationDeclined": return "Invitation declined";
    case "entered": return `${rejoined ? "Rejoined" : "Joined"}${stage ? ` during ${stage}` : ""}${phase}`;
    case "rejoined":
    case "reentered":
    case "participationReopened": return `Rejoined${stage ? ` during ${stage}` : ""}${phase}`;
    case "reopened": return "Participation reopened";
    case "left": return `Left${stage ? ` during ${stage}` : ""}${phase}`;
    case "removed": return `Removed${stage ? ` during ${stage}` : ""}${phase}`;
    case "expelled": return `Expelled${stage ? ` during ${stage}` : ""}${phase}`;
    default: {
      if (!event.type) return null;
      const label = String(event.type)
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
      return event.reason ? `${label} · ${event.reason}` : label;
    }
  }
};

const ParticipationHistory = ({ expert }) => {
  const sourceEvents = expert.events || [];
  const entries = sourceEvents.filter((event) => event.type === "entered");
  const laterEntries = new Set(entries.slice(1));
  const events = [...sourceEvents]
    .filter((event) => {
      if (!event.type) return false;
      if (event.type === "invitationAccepted") return false;
      if (/(submitted|submission)/i.test(event.type || "")) return false;
      if (event.type === "entered") return laterEntries.has(event) || Boolean(event.reason);
      return true;
    })
    .sort((left, right) => new Date(left.occurredAt || 0).getTime() - new Date(right.occurredAt || 0).getTime());

  if (!events.length) return null;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: "text.primary", fontWeight: "fontWeightBold" }}>Participation history</Typography>
      <Stack component="ul" spacing={0.3} sx={{ m: 0, mt: 0.25, pl: 1.8 }}>
        {events.map((event, index) => {
          const label = eventLabel(event, laterEntries.has(event));
          const date = formatDateTime(event.occurredAt);
          return <Typography component="li" key={`${event.type}-${event.occurredAt || index}`} variant="caption" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>{label}{date ? ` — ${date}` : ""}</Typography>;
        })}
      </Stack>
    </Box>
  );
};

const ExpertRowDetails = ({ expert }) => (
  <Box data-testid="expert-detail-area" sx={overviewExpertDetailsSx}>
    <Box>
      <Typography variant="caption" sx={{ display: "block", mb: 0.45, color: "text.secondary", fontWeight: "fontWeightBold", textTransform: "uppercase", letterSpacing: 0.35 }}>Submission summary</Typography>
      <Box data-testid="expert-submission-summary" sx={overviewExpertSubmissionGridSx}>
        <SubmissionDetail title="Invitation" status={statusForInvitation(expert.invitation).label} date={formatDateTime(expert.invitation?.respondedAt)} />
        <StageDetail title="Criteria weighting" stage={expert.criteriaWeighting} />
        <StageDetail title="Alternative evaluation" stage={expert.alternativeEvaluation} />
      </Box>
    </Box>
    <ParticipationHistory expert={expert} />
  </Box>
);

const StatusIcon = ({ status }) => (
  <Tooltip title={status.label} describeChild>
    <Box component="span" aria-label={status.label} sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
      {iconForStatus(status.state)}
    </Box>
  </Tooltip>
);

const ParticipationPanel = ({ participation, participationSummary }) => {
  const [expanded, setExpanded] = useState({});
  const rows = participation?.rows || [];

  return (
    <OverviewPanel title="Expert participation" icon={<GroupsRoundedIcon fontSize="small" />} count={`${rows.length} experts`}>
      <Box sx={issueInfoParticipationGridSx}>
        <Box data-testid="overview-participation-chart" sx={overviewParticipationChartSx}>
          <ParticipationDonutChart participation={participationSummary} />
        </Box>
        {rows.length ? (
          <TableContainer data-testid="overview-participant-list" sx={issueInfoExpertTableViewportSx}>
          <Table size="small" stickyHeader aria-label="Expert participation" sx={{ minWidth: 620 }}>
            <TableHead>
              <TableRow>
                {["Expert", "Invitation", "Criteria weighting", "Alternative evaluation", "Participation"].map((heading) => (
                  <TableCell key={heading} align={heading === "Expert" ? "left" : "center"} sx={{ fontSize: "0.72rem", fontWeight: "fontWeightBold", whiteSpace: "nowrap", bgcolor: "rgba(10, 25, 38, 0.98)", borderBottom: 0 }}>{heading}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            {rows.map((expert, index) => {
              const key = String(expert.expertId || expert.id || index);
              const isExpanded = expanded[key] === true;
              const toggleExpanded = () => setExpanded((current) => ({ ...current, [key]: !current[key] }));
              const invitationStatus = statusForInvitation(expert.invitation);
              const criteriaStatus = statusForStage(expert.criteriaWeighting);
              const alternativeStatus = statusForStage(expert.alternativeEvaluation);
              const isLastExpert = index === rows.length - 1;
              return (
                <TableBody
                  key={key}
                  sx={{
                    "& .MuiTableCell-root": { borderBottom: 0 },
                    "& > .MuiTableRow-root:last-of-type > .MuiTableCell-root": {
                      borderBottom: isLastExpert ? 0 : overviewDataRowSeparator,
                    },
                  }}
                >
                  <TableRow
                    hover
                    tabIndex={0}
                    aria-label={`Toggle details for ${expert.name || "expert"}`}
                    aria-expanded={isExpanded}
                    onClick={toggleExpanded}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleExpanded();
                      }
                    }}
                    sx={{ cursor: "pointer", "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.light", outlineOffset: -2 } }}
                  >
                    <TableCell sx={{ minWidth: 120 }}>
                      <Typography variant="body2" noWrap title={expert.name} sx={{ fontWeight: "fontWeightBold" }}>{expert.name || "Unknown expert"}</Typography>
                      {expert.email ? <Typography variant="caption" noWrap display="block" color="text.secondary" title={expert.email}>{expert.email}</Typography> : null}
                    </TableCell>
                    <TableCell align="center" sx={{ minWidth: 80 }}><StatusIcon status={invitationStatus} /></TableCell>
                    <TableCell align="center" sx={{ minWidth: 100 }}><StatusIcon status={criteriaStatus} /></TableCell>
                    <TableCell align="center" sx={{ minWidth: 110 }}><StatusIcon status={alternativeStatus} /></TableCell>
                    <TableCell align="left" sx={{ minWidth: 155 }}>
                      <Stack direction="row" spacing={0.45} alignItems="center" justifyContent="center" sx={{ width: "100%" }}>
                        <Typography variant="caption" sx={{ color: "text.primary", textAlign: "center", whiteSpace: "normal", overflowWrap: "anywhere" }}>{expert.participationLabel || "No participation"}</Typography>
                        <Tooltip title={isExpanded ? "Hide participation details" : "Show participation details"}><IconButton size="small" aria-label={`${isExpanded ? "Collapse" : "Expand"} ${expert.name || "expert"} details`} onClick={(event) => { event.stopPropagation(); toggleExpanded(); }}>{isExpanded ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}</IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  <TableRow><TableCell colSpan={5} sx={{ p: 0, borderBottom: 0 }}><Collapse in={isExpanded} timeout="auto" unmountOnExit><ExpertRowDetails expert={expert} /></Collapse></TableCell></TableRow>
                </TableBody>
              );
            })}
          </Table>
          </TableContainer>
        ) : <Typography color="text.secondary">No expert participation is available.</Typography>}
      </Box>
    </OverviewPanel>
  );
};

export default ParticipationPanel;
