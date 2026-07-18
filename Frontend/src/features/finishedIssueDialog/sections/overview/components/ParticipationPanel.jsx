import {
  Avatar,
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";

import {
  overviewParticipantRowSx,
  overviewParticipationChartSx,
  overviewParticipationGridSx,
  overviewParticipationListSx,
} from "../overview.styles";
import OverviewPanel from "./OverviewPanel";
import ParticipationDonutChart from "./charts/ParticipationDonutChart";

const participantStatus = (participant) => {
  if (participant.invitationStatus === "declined") {
    return { label: "Declined", color: "error" };
  }

  if (participant.invitationStatus === "pending") {
    return { label: "Pending", color: "default" };
  }

  if (
    participant.invitationStatus === "accepted" &&
    participant.evaluationCompleted
  ) {
    return { label: "Completed", color: "success" };
  }

  if (participant.invitationStatus === "accepted") {
    return { label: "Accepted", color: "secondary" };
  }

  return { label: "Unknown", color: "default" };
};

const initialFor = (name) =>
  typeof name === "string" && name.trim()
    ? name.trim().charAt(0).toUpperCase()
    : "?";

const ParticipationPanel = ({ participation }) => (
  <OverviewPanel
    title="Experts & participation"
    icon={<GroupsRoundedIcon fontSize="small" />}
    count={participation.total}
  >
    <Box sx={overviewParticipationGridSx}>
      {participation.records.length ? (
        <Stack data-testid="overview-participant-list" spacing={0.7} sx={overviewParticipationListSx}>
          {participation.records.map((participant) => {
            const status = participantStatus(participant);

            return (
              <Box key={participant.id} sx={overviewParticipantRowSx}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: "rgba(47, 159, 194, 0.23)",
                    color: "secondary.light",
                    typography: "body2",
                    fontWeight: "fontWeightBold",
                  }}
                >
                  {initialFor(participant.name)}
                </Avatar>

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    noWrap
                    title={participant.name}
                    sx={{ fontWeight: "fontWeightBold" }}
                  >
                    {participant.name}
                  </Typography>
                  {participant.email ? (
                    <Typography
                      variant="caption"
                      noWrap
                      title={participant.email}
                      sx={{
                        mt: 0.1,
                        color: "text.secondary",
                      }}
                    >
                      {participant.email}
                    </Typography>
                  ) : null}
                </Box>

                <Chip
                  size="small"
                  variant="outlined"
                  color={status.color}
                  label={status.label}
                  sx={{
                    height: 23,
                    fontWeight: "fontWeightBold",
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Typography color="text.secondary">No participants are available.</Typography>
      )}

      <Box data-testid="overview-participation-chart" sx={overviewParticipationChartSx}>
        <Stack alignItems="center" spacing={0.55}>
          <ParticipationDonutChart participation={participation} />
          <Typography variant="body2" sx={{ fontWeight: "fontWeightBold" }}>
            {participation.accepted > 0
              ? `${participation.completed}/${participation.accepted} accepted experts completed`
              : "No accepted participants"}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              textAlign: "center",
            }}
          >
            {participation.pending} pending · {participation.declined} declined
          </Typography>
        </Stack>
      </Box>
    </Box>
  </OverviewPanel>
);

export default ParticipationPanel;
