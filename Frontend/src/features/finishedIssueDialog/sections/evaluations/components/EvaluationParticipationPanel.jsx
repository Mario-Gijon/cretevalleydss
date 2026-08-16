import {
  Avatar,
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";

import {
  evaluationParticipationGridSx,
  evaluationParticipantRowSx,
  evaluationsPanelHeaderSx,
  evaluationsPanelSx,
  evaluationsScrollableSx,
} from "../evaluations.styles";
import EvaluationParticipationDonut from "./charts/EvaluationParticipationDonut";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const initials = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim().charAt(0).toUpperCase()
    : "?";

const submissionLabel = (row, hasCriteriaWeighting) => {
  if (row.participationLabel) return row.participationLabel;
  if (hasCriteriaWeighting && row.submittedBoth) return "Both stages";
  if (row.criteriaWeighting) return "Criteria weighting";
  if (row.alternativeEvaluation) return "Alternative evaluation";
  return "—";
};

const latestSubmittedAt = (row) => {
  const values = [
    row.criteriaWeighting?.submittedAt,
    row.alternativeEvaluation?.submittedAt,
    ...(row.criteriaWeighting?.submissions || []).filter((entry) => entry.completed).map((entry) => entry.submittedAt),
    ...(row.alternativeEvaluation?.submissions || []).filter((entry) => entry.completed).map((entry) => entry.submittedAt),
  ].filter(Boolean);

  return values.sort(
    (left, right) =>
      new Date(right).getTime() - new Date(left).getTime()
  )[0] || null;
};

const EvaluationParticipationPanel = ({
  participation,
  hasCriteriaWeighting,
}) => (
  <Box sx={evaluationsPanelSx}>
    <Box sx={evaluationsPanelHeaderSx}>
      <GroupsRoundedIcon
        sx={{ color: "secondary.light", fontSize: 21 }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" component="h2">
          Evaluation participation
        </Typography>
        <Typography variant="caption"
          sx={{
            color: "text.secondary",
          }}
        >
          Complete stored participation and submission audit.
        </Typography>
      </Box>
      <Chip
        size="small"
        variant="outlined"
        color="secondary"
        label={`${participation.summary.total} experts`}
        sx={{ ml: "auto", height: 24, fontWeight: 850 }}
      />
    </Box>

    <Box sx={evaluationParticipationGridSx}>
      <Stack alignItems="center" justifyContent="center" spacing={0.7}>
        <EvaluationParticipationDonut
          summary={participation.summary}
          hasCriteriaWeighting={hasCriteriaWeighting}
        />
        {hasCriteriaWeighting ? (
          <Stack spacing={0.25} sx={{ width: "100%", maxWidth: 250 }}>
            <Typography variant="caption">
              Both stages: {participation.summary.both}
            </Typography>
            <Typography variant="caption">
              Criteria only: {participation.summary.criteriaOnly}
            </Typography>
            <Typography variant="caption">
              Alternative only: {participation.summary.alternativeOnly}
            </Typography>
            <Typography variant="caption">No submissions: {participation.summary.none || 0}</Typography>
          </Stack>
        ) : null}
      </Stack>

      <Stack spacing={0.65} sx={evaluationsScrollableSx("participants")}>
        {participation.rows.length ? (
          participation.rows.map((row) => (
            <Box key={row.expertId} sx={evaluationParticipantRowSx}>
              <Avatar
                sx={{
                  gridArea: "avatar",
                  width: 34,
                  height: 34,
                  bgcolor: "rgba(51, 164, 197, 0.20)",
                  color: "secondary.light",
                  typography: "body2",
                  fontWeight: "fontWeightBold",
                }}
              >
                {initials(row.name)}
              </Avatar>

              <Box sx={{ gridArea: "identity", minWidth: 0 }}>
                <Typography variant="body2"
                  noWrap
                  title={row.name}
                  sx={{ fontWeight: "fontWeightBold" }}
                >
                  {row.name}
                </Typography>
                {row.email ? (
                  <Typography variant="caption"
                    noWrap
                    title={row.email}
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    {row.email}
                  </Typography>
                ) : null}
              </Box>

              <Box sx={{ gridArea: "coverage", minWidth: 0 }}>
                <Typography variant="caption"
                  noWrap
                  title={submissionLabel(row, hasCriteriaWeighting)}
                  sx={{
                    color: "secondary.light",
                    fontWeight: "fontWeightBold",
                  }}
                >
                  {submissionLabel(row, hasCriteriaWeighting)}
                </Typography>
                <Typography variant="caption"
                  noWrap
                  title={formatDate(latestSubmittedAt(row))}
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  {formatDate(latestSubmittedAt(row))}
                </Typography>
              </Box>

              {row.invitation ? (
                <Chip size="small" variant="outlined" color={row.invitation.status === "accepted" ? "success" : row.invitation.status === "declined" ? "error" : "default"} label={row.invitation.status} sx={{ gridArea: "status", height: 23 }} />
              ) : row.currentlyRemoved ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label="Removed later"
                  sx={{ gridArea: "status", height: 23 }}
                />
              ) : (
                <Chip
                  size="small"
                  variant="outlined"
                  color="success"
                  label="Submitted"
                  sx={{ gridArea: "status", height: 23 }}
                />
              )}
            </Box>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No stored expert submissions are available.
          </Typography>
        )}
      </Stack>
    </Box>
  </Box>
);

export default EvaluationParticipationPanel;
