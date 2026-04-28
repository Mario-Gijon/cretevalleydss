import { Switch, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";

export default function CatalogVisibilitySwitch({
  checked,
  loading = false,
  disabled = false,
  onChange,
}) {
  return (
    <Tooltip
      arrow
      placement="top"
      title={checked ? "Visible in Create Issue" : "Hidden from Create Issue"}
    >
      <Switch
        checked={checked}
        disabled={disabled || loading}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          event.stopPropagation();
          onChange?.(event);
        }}
        inputProps={{
          "aria-label": checked ? "Deactivate model" : "Activate model",
        }}
        sx={(theme) => ({
          width: 46,
          height: 26,
          p: 0,
          "& .MuiSwitch-switchBase": {
            p: "3px",
            transitionDuration: "180ms",
            "&.Mui-checked": {
              transform: "translateX(20px)",
              color: theme.palette.common.white,
              "& + .MuiSwitch-track": {
                bgcolor: alpha(theme.palette.success.main, 0.65),
                borderColor: alpha(theme.palette.success.light, 0.4),
                opacity: 1,
              },
            },
            "&.Mui-disabled + .MuiSwitch-track": {
              opacity: 0.35,
            },
          },
          "& .MuiSwitch-thumb": {
            width: 20,
            height: 20,
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.common.white,
              0.95
            )}, ${alpha(theme.palette.common.white, 0.72)})`,
            boxShadow: `0 4px 14px ${alpha(theme.palette.common.black, 0.35)}`,
          },
          "& .MuiSwitch-track": {
            borderRadius: 999,
            bgcolor: alpha(theme.palette.error.main, 0.55),
            border: `1px solid ${alpha(theme.palette.error.light, 0.35)}`,
            opacity: 1,
            backdropFilter: "blur(10px)",
          },
        })}
      />
    </Tooltip>
  );
}