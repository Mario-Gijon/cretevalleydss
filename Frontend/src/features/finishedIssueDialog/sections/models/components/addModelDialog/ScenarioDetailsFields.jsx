import { TextField } from "@mui/material";

import { SCENARIO_DESCRIPTION_MAX } from "../../../../logic/scenarioDraft.constants.js";

const ScenarioDetailsFields = ({
  descriptionLength,
  scenarioDescription,
  scenarioName,
  onDescriptionChange,
  onNameChange,
}) => (
  <>
    <TextField
      color="secondary"
      label="Scenario name"
      required
      fullWidth
      value={scenarioName}
      onChange={(event) => onNameChange(event.target.value)}
    />
    <TextField
      color="secondary"
      label="Scenario description"
      required
      fullWidth
      multiline
      minRows={3}
      value={scenarioDescription}
      inputProps={{ maxLength: SCENARIO_DESCRIPTION_MAX }}
      helperText={`${descriptionLength}/${SCENARIO_DESCRIPTION_MAX}`}
      onChange={(event) => onDescriptionChange(event.target.value)}
    />
  </>
);

export default ScenarioDetailsFields;
