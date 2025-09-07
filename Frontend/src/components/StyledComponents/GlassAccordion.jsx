import { styled, Accordion } from "@mui/material";

export const GlassAccordion = styled(Accordion)(() => ({
  transition: "transform 0.2s, boxShadow 0.2s, background 0.3s",
  
  /* Glass base */
  background: "rgba(131, 211, 245, 0.02)",
  color: "#FFFFFF",
  /* boxShadow: "0 5px 18px rgba(0,0,0,0.4)", */
  backdropFilter: "blur(15px)",
  WebkitBackdropFilter: "blur(15px)",

  /* Para eliminar el pseudo-before que MUI agrega en outlined */
  "&:before": {
    display: "none",
  },

  /* Mantener glass al expandir */
  "&.Mui-expanded": {
    background: "rgba(131, 211, 245, 0.02)",
  },
}));