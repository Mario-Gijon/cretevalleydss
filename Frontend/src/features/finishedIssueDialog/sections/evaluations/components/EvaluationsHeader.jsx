import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
} from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";

import {
  evaluationsHeaderSx,
  evaluationsActionGroupSx,
  evaluationsExpertControlSx,
  evaluationsRoundControlSx,
  evaluationsSelectorGroupSx,
  evaluationsToggleSx,
} from "../evaluations.styles";

const consensusRoundLabelId = "finished-issue-consensus-round-label";
const expertLabelId = "finished-issue-expert-label";

const EvaluationsHeader = ({ data, state, actions }) => (
  <Box sx={evaluationsHeaderSx}>
    <Stack sx={evaluationsSelectorGroupSx} data-testid="evaluations-selector-group">
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
    </Stack>

    {data.canShowCollective ? (
      <Stack sx={evaluationsActionGroupSx} data-testid="evaluations-action-group">
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
      </Stack>
    ) : null}
  </Box>
);

export default EvaluationsHeader;
