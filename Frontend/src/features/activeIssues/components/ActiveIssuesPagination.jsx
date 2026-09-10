import { Box, Pagination } from "@mui/material";

/**
 * Paginación local de los issues activos.
 *
 * @param {Object} props Props del componente.
 * @param {number} props.page Página actual.
 * @param {number} props.pageCount Número total de páginas.
 * @param {Function} props.onChange Callback de cambio de página.
 * @returns {JSX.Element|null}
 */
const ActiveIssuesPagination = ({ page, pageCount, onChange }) => {
  if (pageCount <= 1) return null;

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 1.25 }}>
      <Pagination
        page={page}
        count={pageCount}
        size="small"
        color="secondary"
        shape="rounded"
        aria-label="Active issues pages"
        onChange={(_, nextPage) => onChange(nextPage)}
      />
    </Box>
  );
};

export default ActiveIssuesPagination;
