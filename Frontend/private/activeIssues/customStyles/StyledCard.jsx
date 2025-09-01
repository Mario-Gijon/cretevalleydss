import { Chip, styled } from "@mui/material";
import { Paper } from "@mui/material";
import Accordion from "@mui/material/Accordion";

export const GlassCard = styled(Paper)(() => ({
  borderRadius: "12px",
  transition: "transform 0.2s, boxShadow 0.2s, background 0.3s",

  /* Glass real */
  background: "rgba(131, 211, 245, 0.02)",
  color: "#FFFFFF",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(15px)",
  WebkitBackdropFilter: "blur(15px)",
  border: "1px solid rgba(255,255,255,0.1)",

  "&:hover": {
    transform: "scale(1.02)",
    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
    background: "rgba(255, 255, 255, 0)", // ligero efecto glass sin gris
  },
}));

export const GlassPaper = styled(Paper)(() => ({
  borderRadius: "12px",
  background: "rgba(131, 211, 245, 0.02)",
  color: "#FFFFFF",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(15px)",
  WebkitBackdropFilter: "blur(15px)",
  border: "1px solid rgba(255,255,255,0.1)",
}));

export const GlassAccordion = styled(Accordion)(() => ({
  transition: "transform 0.2s, boxShadow 0.2s, background 0.3s",
  
  /* Glass base */
  background: "rgba(131, 211, 245, 0.02)",
  color: "#FFFFFF",
  boxShadow: "0 5px 18px rgba(0,0,0,0.4)",
  backdropFilter: "blur(15px)",
  WebkitBackdropFilter: "blur(15px)",
  border: "0.1px solid rgba(255,255,255,0.1)",

  /* Para eliminar el pseudo-before que MUI agrega en outlined */
  "&:before": {
    display: "none",
  },

  /* Mantener glass al expandir */
  "&.Mui-expanded": {
    background: "rgba(131, 211, 245, 0.02)",
  },
}));


import { Dialog } from "@mui/material";

export const GlassDialogPaper = styled(Paper)(() => ({
  borderRadius: "12px",
  background: "rgba(5, 12, 20, 0.64)",
  color: "#FFFFFF",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(25px)",
  WebkitBackdropFilter: "blur(25px)",
  border: "1px solid rgba(255,255,255,0.1)",
}));

export const GlassDialog = (props) => {
  return (
    <Dialog
      {...props}
      PaperComponent={GlassDialogPaper} // aquí aplicamos el estilo glass
    />
  );
};


export const StyledChip = styled(Chip)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontWeight: "bold",
}));