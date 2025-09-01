import { Card, Chip, Paper, styled } from "@mui/material";

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

export const CustomPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  height: "auto",
  minHeight: 200,
  padding: theme.spacing(2),
  ...theme.typography.body2,
  textAlign: 'center',
  borderRadius: "10px",
}));