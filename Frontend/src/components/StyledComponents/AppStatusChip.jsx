import { Chip } from "@mui/material";
import { alpha } from "@mui/material/styles";

const normalizeTone = (tone) => {
  if (tone === "success" || tone === "warning" || tone === "error" || tone === "secondary") {
    return tone;
  }

  return "secondary";
};

/**
 * Shared compact presentation for application state indicators.
 *
 * @param {object} props Component props.
 * @param {string} props.label Status text.
 * @param {string} [props.tone] Semantic visual tone.
 * @param {React.ReactElement} [props.icon] Optional contextual status icon.
 * @returns {JSX.Element}
 */
const AppStatusChip = ({ label, tone = "info", icon, sx, ...chipProps }) => {
  const resolvedTone = normalizeTone(tone);

  return (
    <Chip
      {...chipProps}
      data-status-tone={resolvedTone}
      icon={icon}
      label={label || "Unknown"}
      size="small"
      variant="outlined"
      sx={(theme) => {
        const toneColor = theme.palette[resolvedTone].main;

        return {
          height: 26,
          borderRadius: 999,
          fontWeight: 900,
          color: theme.palette.text.primary,
          bgcolor: alpha(toneColor, 0.1),
          borderColor: alpha(toneColor, 0.32),
          "& .MuiChip-icon": {
            color: toneColor,
            fontSize: 16,
            ml: 0.6,
          },
          "& .MuiChip-label": {
            px: icon ? 0.85 : 1,
          },
          ...sx,
        };
      }}
    />
  );
};

export default AppStatusChip;
