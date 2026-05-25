import { Typography } from "@mui/material";

export const NumberGlobalParameterReadOnly = ({ parameter, value }) => {
  const shown = value ?? parameter?.default;

  if (shown === null || shown === undefined || shown === "") {
    return <Typography variant="body2" sx={{ fontWeight: 850 }}>—</Typography>;
  }

  return <Typography variant="body2" sx={{ fontWeight: 850 }}>{String(shown)}</Typography>;
};

export default NumberGlobalParameterReadOnly;
