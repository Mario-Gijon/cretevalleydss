import { Typography } from "@mui/material";

const VisualizationReadingGuide = ({ children }) => (
  <Typography
    component="p"
    data-testid="visualization-reading-guide"
    variant="body2"
    color="text.secondary"
    sx={{ mb: 1 }}
  >
    {children}
  </Typography>
);

export default VisualizationReadingGuide;
