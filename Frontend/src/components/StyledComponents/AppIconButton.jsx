import { IconButton, Tooltip } from "@mui/material";

/**
 * Shared accessible icon action with a consistent tooltip and touch target.
 *
 * @param {object} props Component props.
 * @param {string} props.label Tooltip and default accessible label.
 * @param {string} [props.ariaLabel] Optional accessible-label override.
 * @param {React.ReactNode} props.children Icon content.
 * @returns {JSX.Element}
 */
const AppIconButton = ({ label, ariaLabel, children, size = "medium", sx, disabled, ...iconButtonProps }) => {
  return (
    <Tooltip title={label}>
      <span style={{ display: "inline-flex" }}>
        <IconButton
          {...iconButtonProps}
          aria-label={ariaLabel || label}
          disabled={disabled}
          size={size}
          sx={{
            minWidth: size === "small" ? 36 : 44,
            minHeight: size === "small" ? 36 : 44,
            ...sx,
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default AppIconButton;
