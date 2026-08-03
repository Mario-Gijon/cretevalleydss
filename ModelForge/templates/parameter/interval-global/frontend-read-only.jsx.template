import { Typography } from "@mui/material";

const isEmpty = (value) => value === null || value === undefined || value === "";

export const IntervalGlobalParameterReadOnly = ({ value }) => {
  if (isEmpty(value)) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 800 }}>
        —
      </Typography>
    );
  }

  if (Array.isArray(value) && value.length >= 2) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 800 }}>
        {`${String(value[0])} → ${String(value[1])}`}
      </Typography>
    );
  }

  return (
    <Typography variant="body2" sx={{ fontWeight: 800 }}>
      {String(value)}
    </Typography>
  );
};

export default IntervalGlobalParameterReadOnly;
