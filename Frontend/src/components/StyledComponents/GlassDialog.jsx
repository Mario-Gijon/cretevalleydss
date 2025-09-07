import { styled, Dialog, Paper } from "@mui/material";

const GlassDialogPaper = styled(Paper)(() => ({
  borderRadius: "12px",
  background: "rgba(7, 10, 14, 0.9)",
  color: "#FFFFFF",
  boxShadow: "0 8px 24px rgba(40, 86, 122, 0.12)",
  backdropFilter: "blur(25px)",
  WebkitBackdropFilter: "blur(25px)",
  /* border: "1px solid rgba(255,255,255,0.1)", */
}));

export const GlassDialog = (props) => {
  return (
    <Dialog
      {...props}
      PaperComponent={GlassDialogPaper} // aquí aplicamos el estilo glass
      sx={{
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
      }}
    />
  );
};