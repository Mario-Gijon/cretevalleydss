import { Box, Pagination } from "@mui/material";

/**
 * Paginación local de los issues activos.
 *
 * @param {Object} props Props del componente.
 * @param {number} props.page Página actual.
 * @param {number} props.pageCount Número total de páginas.
 * @param {Function} props.onChange Callback de cambio de página.
 * @param {Object} props.sx Estilos adicionales del contenedor.
 * @returns {JSX.Element|null}
 */
const ActiveIssuesPagination = ({ page, pageCount, onChange, sx }) => {
  if (pageCount <= 1) return null;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        mt: { xs: 1.25, lg: 2 },
        ...sx,
      }}
    >
      <Pagination
        page={page}
        count={pageCount}
        size="small"
        color="secondary"
        variant="outlined"
        shape="rounded"
        aria-label="Active issues pages"
        onChange={(_, nextPage) => onChange(nextPage)}
        sx={{
          "& .MuiPaginationItem-root": {
            minWidth: { xs: 32, sm: 36, md: 38 },
            height: { xs: 32, sm: 36, md: 38 },
            fontSize: { xs: "0.8125rem", sm: "0.875rem" },
            borderColor: "rgba(255,255,255,0.22)",
          },
          "& .MuiPaginationItem-root.Mui-selected": {
            color: "secondary.main",
            backgroundColor: "transparent",
            borderColor: "secondary.main",
          },
          "& .MuiPaginationItem-root.Mui-selected:hover": {
            backgroundColor: "rgba(128, 203, 196, 0.08)",
          },
          "& .MuiPaginationItem-root.Mui-focusVisible": {
            outline: "2px solid",
            outlineColor: "secondary.main",
            outlineOffset: 2,
          },
          "& .MuiPaginationItem-icon": {
            fontSize: { xs: "1.25rem", sm: "1.4rem" },
          },
        }}
      />
    </Box>
  );
};

export default ActiveIssuesPagination;
