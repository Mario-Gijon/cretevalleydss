import { Paper } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * Alto base de tarjeta para vista desktop de issues finalizados.
 *
 * @type {number}
 */
export const FINISHED_ISSUE_CARD_HEIGHT = 250;

/**
 * Tarjeta glass para cada issue finalizado en el listado.
 */
export const FinishedIssueCard = styled(Paper)(({ theme }) => ({
  borderRadius: 20,
  height: "100%",
  transition:
    "transform 160ms ease, box-shadow 160ms ease, background 220ms ease, border-color 220ms ease",
  background: "rgba(21, 30, 38, 0.18)",
  color: theme.palette.common.white,
  boxShadow: "0 12px 34px rgba(29, 82, 81, 0.18)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.10)",
  overflow: "hidden",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 18px 46px rgba(21, 60, 59, 0.30)",
    background: "rgba(60, 119, 121, 0.1)",
    borderColor: "rgba(255,255,255,0.14)",
  },
}));
