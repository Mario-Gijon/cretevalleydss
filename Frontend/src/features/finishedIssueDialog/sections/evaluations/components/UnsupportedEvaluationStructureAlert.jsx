import { Alert } from "@mui/material";

const UnsupportedEvaluationStructureAlert = () => (
  <Alert severity="warning" variant="outlined">
    This finished issue uses an evaluation structure that is not registered in the frontend.
  </Alert>
);

export default UnsupportedEvaluationStructureAlert;
