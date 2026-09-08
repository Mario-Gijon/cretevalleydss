import { Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { getModelManifestChipSx } from "../styles/modelManifest.styles";
import AppStatusChip from "../../../../components/StyledComponents/AppStatusChip";

export default function StatusChip({ label, severity = "info", semantic = false, icon }) {
  const theme = useTheme();

  if (semantic) {
    return <AppStatusChip label={label} tone={severity} icon={icon} />;
  }

  return (
    <Chip
      size="small"
      label={label || "Unknown"}
      variant="outlined"
      sx={getModelManifestChipSx(theme, severity)}
    />
  );
}
