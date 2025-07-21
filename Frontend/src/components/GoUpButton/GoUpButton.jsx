// Importa hooks de React
import { useState, useEffect } from "react";

// Importa componentes de Material UI
import { Fab, Zoom } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

// Componente Dashboard
export const GoUpButton = () => {

  // Estado para controlar la visibilidad del FAB (botón de acción flotante)
  const [isVisible, setIsVisible] = useState(false);

  // Maneja la visibilidad del FAB basado en el desplazamiento de la página
  const handleScroll = () => {
    const scrolled = window.scrollY;
    setIsVisible(scrolled > 200); // El FAB aparece después de hacer scroll más de 200px
  };

  // Registra y elimina el evento de scroll
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Función para desplazar la página al inicio
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // Desplazamiento suave
    });
  };

  // Duración de la transición del FAB
  const transitionDuration = {
    enter: 300,
    exit: 200,
  };

  return (
    <>
      {/* Botón de acción flotante con animación Zoom */}
      <Zoom
        in={isVisible}
        timeout={transitionDuration}
        style={{
          transitionDelay: `${isVisible ? transitionDuration.exit : 0}ms`,
        }}
        unmountOnExit
      >
        <Fab
          color="secondary"
          size="medium"
          onClick={scrollToTop}
          sx={{
            position: "fixed",
            bottom: {xs:60, sm: 16},
            right: 16,
          }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>
    </>

  );
};
