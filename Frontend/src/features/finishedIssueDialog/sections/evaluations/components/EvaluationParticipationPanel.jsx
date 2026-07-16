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
  if (hasCriteriaWeighting && row.submittedBoth) return "Both stages";
  if (row.criteriaWeighting) return "Criteria weighting";
  if (row.alternativeEvaluation) return "Alternative evaluation";
  return "—";
};

const latestSubmittedAt = (row) => {
  const values = [
    row.criteriaWeighting?.submittedAt,
    row.alternativeEvaluation?.submittedAt,
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
        <Typography component="h2" sx={{ fontSize: 16, fontWeight: 950 }}>
          Evaluation participation
        </Typography>
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          Experts with stored submissions in this context.
        </Typography>
      </Box>
      <Chip
        size="small"
        variant="outlined"
        color="secondary"
        label={`${participation.summary.total} visible`}
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
            <Typography sx={{ fontSize: 11.5 }}>
              Both stages: {participation.summary.both}
            </Typography>
            <Typography sx={{ fontSize: 11.5 }}>
              Criteria only: {participation.summary.criteriaOnly}
            </Typography>
            <Typography sx={{ fontSize: 11.5 }}>
              Alternative only: {participation.summary.alternativeOnly}
            </Typography>
          </Stack>
        ) : null}
      </Stack>

      <Stack spacing={0.65} sx={evaluationsScrollableSx("participants")}>
        {participation.rows.length ? (
          participation.rows.map((row) => (
            <Box key={row.expertId} sx={evaluationParticipantRowSx}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: "rgba(51, 164, 197, 0.20)",
                  color: "secondary.light",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                {initials(row.name)}
              </Avatar>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  noWrap
                  title={row.name}
                  sx={{ fontSize: 12.5, fontWeight: 900 }}
                >
                  {row.name}
                </Typography>
                {row.email ? (
                  <Typography
                    noWrap
                    title={row.email}
                    sx={{
                      color: "text.secondary",
                      fontSize: 10.5,
                    }}
                  >
                    {row.email}
                  </Typography>
                ) : null}
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  noWrap
                  title={submissionLabel(row, hasCriteriaWeighting)}
                  sx={{
                    color: "secondary.light",
                    fontSize: 11.5,
                    fontWeight: 850,
                  }}
                >
                  {submissionLabel(row, hasCriteriaWeighting)}
                </Typography>
                <Typography
                  noWrap
                  title={formatDate(latestSubmittedAt(row))}
                  sx={{
                    color: "text.secondary",
                    fontSize: 10.2,
                  }}
                >
                  {formatDate(latestSubmittedAt(row))}
                </Typography>
              </Box>

              {row.currentlyRemoved ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label="Removed later"
                  sx={{ height: 23, fontSize: 10.2 }}
                />
              ) : (
                <Chip
                  size="small"
                  variant="outlined"
                  color="success"
                  label="Submitted"
                  sx={{ height: 23, fontSize: 10.2 }}
                />
              )}
            </Box>
          ))
        ) : (
          <Typography color="text.secondary" sx={{ fontSize: 12.5 }}>
            No stored expert submissions are available.
          </Typography>
        )}
      </Stack>
    </Box>
  </Box>
);

export default EvaluationParticipationPanel;
