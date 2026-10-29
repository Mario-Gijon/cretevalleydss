import { IconButton, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export const ParameterInfoTooltip = ({ label, text }) => (
  <Tooltip title={text} arrow enterTouchDelay={0}>
    <IconButton
      type="button"
      size="small"
      aria-label={`${label} information`}
      sx={{ color: "text.secondary", p: 0.35 }}
    >
      <InfoOutlinedIcon sx={{ fontSize: 17 }} />
    </IconButton>
  </Tooltip>
);

export default ParameterInfoTooltip;
