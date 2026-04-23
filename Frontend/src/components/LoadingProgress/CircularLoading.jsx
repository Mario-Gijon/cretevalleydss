import { CircularProgress } from "@mui/material";

/**
 * Renderiza un indicador circular centrado.
 *
 * @param {Object} props Props del componente.
 * @param {number|string} props.size Tamaño del spinner.
 * @param {string} props.color Color del spinner.
 * @param {string|number} props.height Altura del contenedor.
 * @returns {JSX.Element}
 */
export const CircularLoading = ({ size, color, height = "90vh" }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height,
      }}
    >
      <CircularProgress size={size} color={color} />
    </div>
  );
};
