import { Typography } from "@mui/material";

const isEmpty = (value) => value === null || value === undefined || value === "";

export const IntervalGlobalParameterReadOnly = ({ parameter, value }) => {
  const shown = value ?? parameter?.default;

  if (isEmpty(shown)) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 800 }}>
        —
      </Typography>
    );
  }

  if (Array.isArray(shown) && shown.length >= 2) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 800 }}>
        {`${String(shown[0])} → ${String(shown[1])}`}
      </Typography>
    );
  }

  return (
    <Typography variant="body2" sx={{ fontWeight: 800 }}>
      {String(shown)}
    </Typography>
  );
};

export default IntervalGlobalParameterReadOnly;