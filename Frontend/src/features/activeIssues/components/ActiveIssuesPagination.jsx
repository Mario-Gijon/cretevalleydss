import IssuePagination from "../../../components/IssuePagination/IssuePagination";

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
  return (
    <IssuePagination
      page={page}
      pageCount={pageCount}
      onChange={onChange}
      ariaLabel="Active issues pages"
      sx={sx}
    />
  );
};

export default ActiveIssuesPagination;
