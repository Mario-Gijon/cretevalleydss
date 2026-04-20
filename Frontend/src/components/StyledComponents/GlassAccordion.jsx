import { styled, Accordion } from "@mui/material";

export const GlassAccordion = styled(Accordion)(() => ({
  transition: "transform 0.2s, boxShadow 0.2s, background 0.3s",
  
                  
  background: "rgba(131, 211, 245, 0.02)",
  color: "#FFFFFF",
                                                
  backdropFilter: "blur(15px)",
  WebkitBackdropFilter: "blur(15px)",

                                                                 
  "&:before": {
    display: "none",
  },

                                  
  "&.Mui-expanded": {
    background: "rgba(131, 211, 245, 0.02)",
  },
}));