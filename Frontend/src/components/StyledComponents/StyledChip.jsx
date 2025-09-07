import { Chip, styled } from "@mui/material";

export const StyledChip = styled(Chip)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontWeight: "bold",
}));