// Importa componentes de Material UI
import { CircularProgress } from "@mui/material";

// Componente CircularLoading
export const CircularLoading = ({ size, color, height="90vh" }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center", // Centra horizontalmente
        alignItems: "center", // Centra verticalmente
        height: height, // Altura completa de la ventana
      }}
    >
      {/* Muestra el CircularProgress con el tamaño y color proporcionados como props */}
      <CircularProgress size={size} color={color} />
    </div>
  );
};
