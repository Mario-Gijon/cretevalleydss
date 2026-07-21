import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
} from "@mui/material";

import {
  evaluationsHeaderSx,
  evaluationsActionGroupSx,
  evaluationsExpertControlSx,
  evaluationsSelectorGroupSx,
  evaluationsToggleSx,
} from "../evaluations.styles";

const expertLabelId = "finished-issue-expert-label";

const EvaluationsHeader = ({ data, state, actions }) => (
  <Box sx={evaluationsHeaderSx}>
    <Stack sx={evaluationsSelectorGroupSx} data-testid="evaluations-selector-group">
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
