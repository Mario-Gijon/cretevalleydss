import { Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { chipSx } from "../utils/modelManifest.styles";

export default function StatusChip({ label, severity = "info" }) {
  const theme = useTheme();

  return (
    <Chip
      size="small"
      label={label || "Unknown"}
      variant="outlined"
      sx={chipSx(theme, severity)}
    />
  );
}
