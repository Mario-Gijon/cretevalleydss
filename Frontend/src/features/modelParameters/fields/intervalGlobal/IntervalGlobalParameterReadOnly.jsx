import { Typography } from "@mui/material";

export const IntervalGlobalParameterReadOnly = ({ parameter, value }) => {
  const shown = value ?? parameter?.default;

  if (shown === null || shown === undefined || shown === "") {
    return <Typography variant="body2" sx={{ fontWeight: 850 }}>—</Typography>;
  }

  if (Array.isArray(shown) && shown.length >= 2) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 850 }}>
        {`${String(shown[0])} → ${String(shown[1])}`}
      </Typography>
    );
  }

  return <Typography variant="body2" sx={{ fontWeight: 850 }}>{String(shown)}</Typography>;
};

export default IntervalGlobalParameterReadOnly;
