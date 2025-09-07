import { styled, Paper } from "@mui/material";

export const GlassPaper = styled(Paper)(() => ({
  borderRadius: "12px",
  background: "rgba(22, 32, 34, 0.17)",
  color: "#FFFFFF",
  backdropFilter: "blur(15px)",
  WebkitBackdropFilter: "blur(15px)",
  border: "1px solid rgba(255,255,255,0.05)",
}));