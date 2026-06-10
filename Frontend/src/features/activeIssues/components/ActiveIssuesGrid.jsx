import { Grid } from "@mui/material";

import ActiveIssueCard from "./ActiveIssueCard";

/**
 * Grid principal de issues activos.
 *
 * @param {Object} props Props del componente.
 * @param {Array} props.issues Issues visibles.
 * @param {Function} props.onOpenIssue Acción al abrir un issue.
 * @param {Object} props.sx Estilos adicionales del grid.
 * @returns {JSX.Element}
 */
const ActiveIssuesGrid = ({ issues = [], onOpenIssue, sx }) => {
  return (
    <Grid container spacing={1.5} sx={sx}>
      {(issues || []).map((issue) => (
        <ActiveIssueCard
          key={issue.id}
          issue={issue}
          onOpenIssue={onOpenIssue}
        />
      ))}
    </Grid>
  );
};

export default ActiveIssuesGrid;
