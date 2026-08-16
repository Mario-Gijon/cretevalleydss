import { Fragment, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  evaluationParticipantCellSx,
  evaluationParticipantDetailSx,
  evaluationParticipantIdentitySx,
  evaluationParticipationGridSx,
  evaluationParticipationTableContainerSx,
  evaluationParticipationTableSx,
  evaluationsPanelHeaderSx,
  evaluationsPanelSx,
} from "../evaluations.styles";
import EvaluationParticipationDonut from "./charts/EvaluationParticipationDonut";

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};
const initials = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim().charAt(0).toUpperCase()
    : "?";
const phaseLabel = (phase) => (phase === 0 ? "Initial" : `Round ${phase}`);
const normalizeCoverage = (coverage) => {
  if (!coverage) return { submissions: [], completed: 0, total: 0 };
  if (Array.isArray(coverage.submissions))
    return {
      submissions: coverage.submissions,
      completed: coverage.completed || 0,
      total: coverage.total || coverage.submissions.length,
    };
  return {
    submissions: coverage.completed
      ? [{ completed: true, submittedAt: coverage.submittedAt }]
      : [],
    completed: coverage.completed ? 1 : 0,
    total: 1,
  };
};
const coverageLabel = (coverage, required) => {
  if (!required) return { primary: "Not required", secondary: null };
  const value = normalizeCoverage(coverage);
  const completed = value.submissions.filter((entry) => entry.completed);
  const latest = completed
    .map((entry) => entry.submittedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  if (value.total > 1)
    return {
      primary: `${value.completed} / ${value.total} phases`,
      secondary: latest ? `Last: ${formatDate(latest)}` : null,
    };
  const submitted = completed[0];
  return {
    primary: submitted ? "Submitted" : "Not submitted",
    secondary: submitted?.submittedAt
      ? formatDate(submitted.submittedAt)
      : null,
  };
};
const invitationLabel = (invitation) => {
  const status = invitation?.status || "pending";
  return {
    primary: status.charAt(0).toUpperCase() + status.slice(1),
    secondary: invitation?.respondedAt
      ? formatDate(invitation.respondedAt)
      : null,
  };
};
const DetailText = ({ primary, secondary, muted = false }) => (
  <Stack spacing={0.15}>
    <Typography
      variant="body2"
      sx={{ fontWeight: 750, color: muted ? "text.secondary" : "text.primary" }}
    >
      {primary}
    </Typography>
    {secondary ? (
      <Typography variant="caption" color="text.secondary" noWrap>
        {secondary}
      </Typography>
    ) : null}
  </Stack>
);
const meaningfulEvents = (row) => {
  const events = Array.isArray(row.events) ? row.events : [];
  const entered = events.filter((event) => event.type === "entered");
  return (
    events.some(
      (event) =>
        event.type === "left" ||
        event.type === "removed" ||
        event.type === "reentered",
    ) ||
    entered.length > 1 ||
    entered.some((event) => event.phase > 0)
  );
};
const phaseEntries = (coverage, phases, stage) => {
  const normalized = normalizeCoverage(coverage);
  const known = new Map(
    normalized.submissions.map((entry) => [entry.phase, entry]),
  );
  return (
    phases.length ? phases : normalized.submissions.map((entry) => entry.phase)
  ).map((phase, index) => ({
    ...(known.get(phase) || {}),
    stage,
    phase: phase ?? index,
    completed: known.get(phase)?.completed === true,
  }));
};
const hasDetails = (row) => {
  const criteria = normalizeCoverage(row.criteriaWeighting);
  const alternatives = normalizeCoverage(row.alternativeEvaluation);
  return (
    meaningfulEvents(row) ||
    criteria.total > 1 ||
    alternatives.total > 1 ||
    criteria.completed < criteria.total ||
    alternatives.completed < alternatives.total
  );
};
const ParticipationDetails = ({ row }) => {
  const submissions = [
    ...phaseEntries(
      row.criteriaWeighting,
      row.criteriaPhases || [],
      "Criteria weighting",
    ),
    ...phaseEntries(
      row.alternativeEvaluation,
      row.alternativePhases || [],
      "Alternative evaluation",
    ),
  ];
  const events = Array.isArray(row.events)
    ? [...row.events].sort((left, right) =>
        String(left.occurredAt || "").localeCompare(
          String(right.occurredAt || ""),
        ),
      )
    : [];
  return (
    <Box sx={evaluationParticipantDetailSx}>
      {submissions.length ? (
        <Stack spacing={0.35}>
          {["Criteria weighting", "Alternative evaluation"].map((stage) => {
            const entries = submissions.filter(
              (entry) => entry.stage === stage,
            );
            return entries.length ? (
              <Stack spacing={0.2} key={stage}>
                <Typography
                  variant="caption"
                  sx={{ color: "secondary.light", fontWeight: 800 }}
                >
                  {stage}
                </Typography>
                {entries.map((entry, index) => (
                  <Typography
                    variant="caption"
                    key={`${stage}-${entry.phase}-${index}`}
                  >
                    {phaseLabel(entry.phase)} ·{" "}
                    {entry.completed ? "Submitted" : "Not submitted"}
                    {entry.submittedAt
                      ? ` · ${formatDate(entry.submittedAt)}`
                      : ""}
                  </Typography>
                ))}
              </Stack>
            ) : null;
          })}
        </Stack>
      ) : null}
      {meaningfulEvents(row) && events.length ? (
        <Stack spacing={0.35} sx={{ mt: submissions.length ? 0.9 : 0 }}>
          <Typography
            variant="caption"
            sx={{ color: "secondary.light", fontWeight: 800 }}
          >
            Participation history
          </Typography>
          {events
            .filter(
              (event) =>
                event.type !== "invitationAccepted" &&
                !(event.type === "entered" && event.phase === 0),
            )
            .map((event, index) => (
              <Typography
                variant="caption"
                key={`${event.type}-${event.occurredAt}-${index}`}
              >
                {String(event.type || "Event").replace(/\b\w/g, (letter) =>
                  letter.toUpperCase(),
                )}
                {event.phase != null ? ` · ${phaseLabel(event.phase)}` : ""}
                {event.occurredAt ? ` · ${formatDate(event.occurredAt)}` : ""}
              </Typography>
            ))}
        </Stack>
      ) : null}
    </Box>
  );
};

const EvaluationParticipationPanel = ({
  participation,
  hasCriteriaWeighting,
  hasAlternativeEvaluation = true,
}) => {
  const [expanded, setExpanded] = useState({});
  const rows = participation?.rows || [];
  const summary = participation?.summary || {
    total: 0,
    both: 0,
    criteriaOnly: 0,
    alternativeOnly: 0,
    none: 0,
  };
  const invitationColor = (status) =>
    status === "accepted"
      ? "success"
      : status === "declined"
        ? "error"
        : "default";
  return (
    <Box sx={evaluationsPanelSx}>
      <Box sx={evaluationsPanelHeaderSx}>
        <GroupsRoundedIcon sx={{ color: "secondary.light", fontSize: 21 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h2">
            Evaluation participation
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Complete stored participation and submission audit.
          </Typography>
        </Box>
        <Chip
          size="small"
          variant="outlined"
          color="secondary"
          label={`${summary.total} experts`}
          sx={{ ml: "auto", height: 24, fontWeight: 850 }}
        />
      </Box>
      <Box sx={evaluationParticipationGridSx}>
      <Stack alignItems="center" justifyContent="center" spacing={0.7} sx={{ alignSelf: "center", minWidth: 0 }}>
          <EvaluationParticipationDonut
            summary={summary}
            hasCriteriaWeighting={hasCriteriaWeighting}
          />
        </Stack>
        <TableContainer sx={evaluationParticipationTableContainerSx}>
          <Table
            size="small"
            aria-label="Evaluation participation audit"
            sx={evaluationParticipationTableSx}
          >
            <TableHead>
              <TableRow>
                <TableCell>Expert</TableCell>
                <TableCell>Invitation</TableCell>
                <TableCell>Criteria weighting</TableCell>
                <TableCell>Alternative evaluation</TableCell>
                <TableCell>Participation</TableCell>
                <TableCell aria-label="Details" sx={{ width: 42 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length ? (
                rows.map((row) => {
                  const criteria = coverageLabel(
                    row.criteriaWeighting,
                    hasCriteriaWeighting,
                  );
                  const alternatives = coverageLabel(
                    row.alternativeEvaluation,
                    hasAlternativeEvaluation,
                  );
          const invitation = invitationLabel(
            row.invitation || { status: row.invitationStatus }
          );
                  const detail = hasDetails(row);
                  const open = Boolean(expanded[row.expertId]);
                  return (
                    <Fragment key={row.expertId}>
                      <TableRow>
                        <TableCell sx={evaluationParticipantCellSx}>
                          <Box sx={evaluationParticipantIdentitySx}>
                            <Avatar
                              sx={{
                                width: 30,
                                height: 30,
                                bgcolor: "rgba(51,164,197,0.20)",
                                color: "secondary.light",
                                fontSize: 14,
                                fontWeight: "fontWeightBold",
                              }}
                            >
                              {initials(row.name)}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                noWrap
                                sx={{ fontWeight: "fontWeightBold" }}
                              >
                                {row.name}
                              </Typography>
                              {row.email ? (
                                <Typography
                                  variant="caption"
                                  noWrap
                                  color="text.secondary"
                                >
                                  {row.email}
                                </Typography>
                              ) : null}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                color={invitationColor(
                  (row.invitation || {}).status || row.invitationStatus
                )}
                            label={invitation.primary}
                            sx={{ height: 23 }}
                          />
                          {invitation.secondary ? (
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                              noWrap
                            >
                              {invitation.secondary}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <DetailText
                            {...criteria}
                            muted={!hasCriteriaWeighting}
                          />
                        </TableCell>
                        <TableCell>
                          <DetailText
                            {...alternatives}
                            muted={!hasAlternativeEvaluation}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 750 }}>
                            {row.participationLabel || "No submissions"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {detail ? (
                            <IconButton
                              size="small"
                              aria-label={`${open ? "Collapse" : "Expand"} details for ${row.name}`}
                              onClick={() =>
                                setExpanded((current) => ({
                                  ...current,
                                  [row.expertId]: !open,
                                }))
                              }
                            >
                              <ExpandMoreRoundedIcon
                                sx={{
                                  transform: open ? "rotate(180deg)" : "none",
                                }}
                              />
                            </IconButton>
                          ) : null}
                        </TableCell>
                      </TableRow>
                      {detail ? (
                        <TableRow key={`${row.expertId}-details`}>
                          <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                            <Collapse in={open} unmountOnExit>
                              <ParticipationDetails row={row} />
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      No stored expert submissions are available.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};
export default EvaluationParticipationPanel;
