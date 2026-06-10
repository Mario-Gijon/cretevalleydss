import { Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { getModelManifestChipSx } from "../styles/modelManifest.styles";

export default function StatusChip({ label, severity = "info" }) {
  const theme = useTheme();

  return (
    <Chip
      size="small"
      label={label || "Unknown"}
      variant="outlined"
      sx={getModelManifestChipSx(theme, severity)}
    />
  );
}
