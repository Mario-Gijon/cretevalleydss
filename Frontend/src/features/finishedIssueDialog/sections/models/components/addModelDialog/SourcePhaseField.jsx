import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

const PHASE_LABEL_ID = "models-dialog-phase-label";

const SourcePhaseField = ({ sourcePhases, selectedSourcePhase, onChange }) => (
  <FormControl color="secondary" fullWidth>
    <InputLabel id={PHASE_LABEL_ID}>Source phase</InputLabel>
    <Select
      color="secondary"
      labelId={PHASE_LABEL_ID}
      label="Source phase"
      value={selectedSourcePhase ?? ""}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {sourcePhases.map((phase) => (
        <MenuItem key={phase} value={phase}>
          Phase {phase}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

export default SourcePhaseField;
