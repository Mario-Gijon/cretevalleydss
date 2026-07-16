import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  Typography,
} from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";

import {
  evaluationsHeaderSx,
  evaluationsExpertControlSx,
  evaluationsRoundControlSx,
  evaluationsToggleSx,
} from "../evaluations.styles";

const consensusRoundLabelId = "finished-issue-consensus-round-label";
const expertLabelId = "finished-issue-expert-label";

const EvaluationsHeader = ({ data, state, actions }) => (
  <Box sx={evaluationsHeaderSx}>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        component="h1"
        sx={{
          fontSize: { xs: 22, md: 26 },
          lineHeight: 1.15,
          fontWeight: 950,
        }}
      >
        Evaluations
      </Typography>
      <Typography
        sx={{
          mt: 0.35,
          color: "text.secondary",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Review stored expert inputs and collective values.
      </Typography>
    </Box>

    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      justifyContent={{ xs: "flex-start", sm: "flex-end" }}
    >
      {data.consensus.enabled ? (
        <FormControl size="small" sx={evaluationsRoundControlSx}>
          <InputLabel id={consensusRoundLabelId}>Consensus round</InputLabel>
          <Select
            id="finished-issue-consensus-round"
            labelId={consensusRoundLabelId}
            value={data.consensus.selectedPhase ?? ""}
            label="Consensus round"
            onChange={(event) =>
              actions.setSelectedConsensusPhase(
                Number(event.target.value)
              )
            }
            startAdornment={
              <GroupsRoundedIcon
                sx={{ mr: 0.75, color: "secondary.light", fontSize: 18 }}
              />
            }
          >
            {data.consensus.availablePhases.map((phase) => (
              <MenuItem key={phase} value={phase}>
                Phase {phase}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}

      <FormControl size="small" sx={evaluationsExpertControlSx}>
        <InputLabel id={expertLabelId}>Expert</InputLabel>
        <Select
          id="finished-issue-expert"
          labelId={expertLabelId}
          value={state.selectedExpertId ?? ""}
          label="Expert"
          disabled={!data.expertOptions.length}
          onChange={(event) => actions.setSelectedExpertId(event.target.value)}
        >
          {data.expertOptions.map((expert) => (
            <MenuItem key={expert.id} value={expert.id}>
              {expert.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {data.canShowCollective ? (
        <ToggleButton
          value="collective"
          variant="outlined"
          selected={state.showCollective}
          onChange={() =>
            actions.setShowCollective(!state.showCollective)
          }
          size="small"
          color="secondary"
          sx={evaluationsToggleSx}
          aria-label="Show collective values"
        >
          {state.showCollective
            ? "Collective shown"
            : "Show collective"}
        </ToggleButton>
      ) : null}
    </Stack>
  </Box>
);

export default EvaluationsHeader;
