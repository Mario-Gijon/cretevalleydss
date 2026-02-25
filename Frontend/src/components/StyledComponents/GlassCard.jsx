import { styled, Paper } from "@mui/material";

export const GlassCard = styled(Paper)(() => ({
  borderRadius: "12px",
  transition: "transform 0.2s, boxShadow 0.2s, background 0.3s",
  /* Glass real */
  background: "rgba(21, 30, 38, 1)",
  color: "#FFFFFF",
  boxShadow: "0 8px 24px rgba(29, 82, 81, 0.2)",
  backdropFilter: "blur(15px)",
  WebkitBackdropFilter: "blur(15px)",
  border: "1px solid rgba(255,255,255,0.1)",

  "&:hover": {
    transform: "scale(1.02)",
    boxShadow: "0 8px 24px rgba(21, 60, 59, 0.3)",
    background: "rgba(29, 47, 61, 1)",
  },
}));