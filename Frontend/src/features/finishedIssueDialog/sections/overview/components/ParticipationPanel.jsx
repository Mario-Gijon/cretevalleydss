import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

import {
  overviewParticipantRowSx,
  overviewParticipationChartSx,
  overviewParticipationGridSx,
  overviewParticipationListSx,
} from "../overview.styles";
import OverviewPanel from "./OverviewPanel";
import ParticipationDonutChart from "./charts/ParticipationDonutChart";

const formatWeight = (weight) => String(Number(weight));

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
            const participated = participant.participated === true;
            const hasWeight = participation.usesExpertWeights && participant.current === true && Number.isFinite(participant.weight);

            return (
              <Box key={participant.id} sx={overviewParticipantRowSx}>
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

                <Stack direction="row" spacing={0.45} alignItems="center">
                  {hasWeight ? <Tooltip title={`${Math.round(participant.weight * 100)}% expert influence`}><Chip size="small" variant="outlined" label={`Weight ${formatWeight(participant.weight)}`} sx={{ height: 23 }} /></Tooltip> : null}
                  <Tooltip title={participated ? "Participated" : "Did not participate"}>
                    <Box component="span" aria-label={participated ? "Participated" : "Did not participate"} sx={{ display: "inline-flex", color: participated ? "success.light" : "text.secondary" }}>
                      {participated ? <CheckCircleRoundedIcon fontSize="small" /> : <CancelOutlinedIcon fontSize="small" />}
                    </Box>
                  </Tooltip>
                </Stack>
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
        </Stack>
      </Box>
    </Box>
  </OverviewPanel>
);

export default ParticipationPanel;
