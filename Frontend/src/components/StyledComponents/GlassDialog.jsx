import { styled, Dialog, Paper } from "@mui/material";

const GlassDialogPaper = styled(Paper)(() => ({
  borderRadius: "12px",
  background: "rgba(16, 24, 34, 0.9)",
  color: "#FFFFFF",
  boxShadow: "0 8px 24px rgba(40, 86, 122, 0.12)",
  backdropFilter: "blur(25px)",
  WebkitBackdropFilter: "blur(25px)",

}));

export const GlassDialog = (props) => {
  return (
    <Dialog
      {...props}
      PaperComponent={GlassDialogPaper}
      sx={{
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
      }}
    />
  );
};