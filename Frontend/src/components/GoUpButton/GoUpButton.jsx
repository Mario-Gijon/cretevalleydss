import { useState, useEffect } from "react";
import { Fab, Zoom } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

/**
 * Botón flotante para volver al inicio de la página.
 *
 * @returns {JSX.Element}
 */
export const GoUpButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = () => {
    const scrolled = window.scrollY;
    setIsVisible(scrolled > 200);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const transitionDuration = {
    enter: 300,
    exit: 200,
  };

  return (
    <>
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
            bottom: { xs: 60, sm: 16 },
            right: 16,
          }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>
    </>
  );
};
