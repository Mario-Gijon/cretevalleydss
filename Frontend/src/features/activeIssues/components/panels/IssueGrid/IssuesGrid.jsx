import { Grid } from "@mui/material";

import IssueCard from "./IssueCard";

/**
 * Grid principal de issues activos.
 *
 * @param {Object} props Props del componente.
 * @param {Array} props.issues Issues visibles.
 * @param {Function} props.onOpenIssue Acción al abrir un issue.
 * @param {Object} props.sx Estilos adicionales del grid.
 * @returns {JSX.Element}
 */
const IssuesGrid = ({ issues = [], onOpenIssue, sx }) => {
  return (
    <Grid container spacing={1.5} sx={sx}>
      {(issues || []).map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          onOpenIssue={onOpenIssue}
        />
      ))}
    </Grid>
  );
};

export default IssuesGrid; 