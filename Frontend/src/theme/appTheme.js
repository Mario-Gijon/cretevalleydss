import { extendTheme, responsiveFontSizes } from "@mui/material/styles";

const FONT_FAMILY = "Source Sans Pro, Arial, sans-serif";

let theme = extendTheme({
  typography: {
    fontFamily: FONT_FAMILY,
    h1: {
      fontFamily: FONT_FAMILY,
      fontWeight: "bold",
    },
    h2: {
      fontFamily: FONT_FAMILY,
      fontWeight: "bold",
    },
    h3: {
      fontFamily: FONT_FAMILY,
      fontWeight: "bold",
    },
    h4: {
      fontFamily: FONT_FAMILY,
      fontWeight: "bold",
    },
    body1: {
      fontFamily: FONT_FAMILY,
      fontWeight: "normal",
    },
    body2: {
      fontFamily: FONT_FAMILY,
      fontWeight: "normal",
    },
    button: {
      fontFamily: FONT_FAMILY,
      fontWeight: "bold",
    },
    caption: {
      fontFamily: FONT_FAMILY,
      fontWeight: "normal",
    },
    overline: {
      fontFamily: FONT_FAMILY,
      fontWeight: "normal",
    },
  },
  colorSchemes: {
    light: {
      palette: {
        mode: "light",
        primary: {
          main: "#134F8A",
          light: "#134F8A",
        },
        secondary: {
          main: "#45C5C5",
          contrastText: "#fff",
        },
        background: {
          default: "#F5F0F6",
          paper: "#FFFFFF",
        },
        text: {
          primary: "#1D1D1B",
          secondary: "#545454",
          disabled: "#134F8A",
        },
        success: {
          main: "#1bd230",
          contrastText: "#fff",
        },
        warning: {
          main: "#abce11",
          contrastText: "#fff",
        },
        error: {
          main: "#f44336",
          light: "#e57373",
          dark: "#D32f2f",
          contrastText: "#fff",
        },
        info: {
          main: "#45C5C5",
          contrastText: "#fff",
        },
      },
    },
    dark: {
      palette: {
        mode: "dark",
        primary: {
          main: "#224261",
          light: "#45C5C5",
        },
        secondary: {
          main: "#45C5C5",
        },
        background: {
          default: "#1D1D1B",
          paper: "#262B32",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#BFBFBF",
          disabled: "#9AECA4",
          info: "#45C5C5",
        },
        success: {
          main: "#68e377",
        },
        warning: {
          main: "#C2E812",
        },
        error: {
          main: "#f44336",
          light: "#e57373",
          dark: "#D32f2f",
        },
        info: {
          main: "#45C5C5",
        },
      },
    },
  },
  colorSchemeSelector: "class",
});

theme = responsiveFontSizes(theme);

export { theme };