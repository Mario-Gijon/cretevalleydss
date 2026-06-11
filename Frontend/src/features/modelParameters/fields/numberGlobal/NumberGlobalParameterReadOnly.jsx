import { Typography } from "@mui/material";

const isEmpty = (value) => value === null || value === undefined || value === "";

export const NumberGlobalParameterReadOnly = ({ parameter, value }) => {
  const shown = value ?? parameter.default;

  return (
    <Typography variant="body2" sx={{ fontWeight: 800 }}>
      {isEmpty(shown) ? "—" : String(shown)}
    </Typography>
  );
};

export default NumberGlobalParameterReadOnly;
