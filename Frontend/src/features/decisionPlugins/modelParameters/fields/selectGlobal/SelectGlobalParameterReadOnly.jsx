import { Typography } from "@mui/material";

const isEmpty = (value) => value === null || value === undefined || value === "";

export const SelectGlobalParameterReadOnly = ({ value }) => {
  return (
    <Typography variant="body2" sx={{ fontWeight: 800 }}>
      {isEmpty(value) ? "—" : String(value)}
    </Typography>
  );
};

export default SelectGlobalParameterReadOnly;
