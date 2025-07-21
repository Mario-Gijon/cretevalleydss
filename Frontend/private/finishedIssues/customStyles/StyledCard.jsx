import { Card, Chip, styled } from "@mui/material";

// Estilos personalizados con styled de MUI
export const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: "12px",
  transition: "transform 0.2s, box-shadow 0.2s",
  "&:hover": {
    transform: "scale(1.02)",
    boxShadow: theme.shadows[6],
  },
}));

export const StyledChip = styled(Chip)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontWeight: "bold",
}));