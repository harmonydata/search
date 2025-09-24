import { Roboto } from "next/font/google";
import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    neutral: {
      main: string;
      contrastText: string;
    };
  }
  interface PaletteOptions {
    neutral?: {
      main: string;
      contrastText: string;
    };
  }
}

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const theme = createTheme({
  palette: {
    primary: {
      main: "#2E5FFF",
      light: "#5B82FF",
      dark: "#2048CC",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#27EDB9",
      light: "#52F1C7",
      dark: "#1BA581",
      contrastText: "#004735",
    },
    neutral: {
      main: "#444653",
      contrastText: "#FFFFFF",
    },
    grey: {
      50: "#F5F5F5",
      100: "#EEEEEE",
      200: "#E0E0E0",
      300: "#CCCCCC",
      400: "#AAAAAA",
      500: "#9E9E9E",
      600: "#757685",
      700: "#616161",
      800: "#424242",
      900: "#212121",
    },
    background: {
      default: "#FFFFFF",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1A1A1A",
      secondary: "#4A4A4A",
    },
    action: {
      active: "#444653",
    },
  },
  typography: {
    fontFamily: roboto.style.fontFamily,
    h1: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.2,
      "@media (min-width:600px)": {
        fontSize: "2rem",
      },
    },
    h2: {
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: 1.3,
      "@media (min-width:600px)": {
        fontSize: "1.5rem",
      },
    },
    h3: {
      fontSize: "1.125rem",
      fontWeight: 600,
      lineHeight: 1.3,
      "@media (min-width:600px)": {
        fontSize: "1.25rem",
      },
    },
    h4: {
      fontSize: "1rem",
      fontWeight: 600,
      lineHeight: 1.3,
      "@media (min-width:600px)": {
        fontSize: "1.125rem",
      },
    },
    h5: {
      fontSize: "0.875rem",
      fontWeight: 600,
      lineHeight: 1.3,
      "@media (min-width:600px)": {
        fontSize: "1rem",
      },
    },
    h6: {
      fontSize: "0.8rem",
      fontWeight: 600,
      lineHeight: 1.3,
      "@media (min-width:600px)": {
        fontSize: "0.875rem",
      },
    },
    subtitle1: {
      fontSize: "0.875rem",
      fontWeight: 500,
      lineHeight: 1.43,
      "@media (min-width:600px)": {
        fontSize: "1rem",
      },
    },
    subtitle2: {
      fontSize: "0.75rem",
      fontWeight: 500,
      lineHeight: 1.43,
      "@media (min-width:600px)": {
        fontSize: "0.875rem",
      },
    },
    body1: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
      "@media (min-width:600px)": {
        fontSize: "1rem",
      },
    },
    body2: {
      fontSize: "0.75rem",
      lineHeight: 1.43,
      "@media (min-width:600px)": {
        fontSize: "0.875rem",
      },
    },
    button: {
      textTransform: "none",
      fontWeight: 500,
      fontSize: "0.875rem",
      "@media (min-width:600px)": {
        fontSize: "0.875rem",
      },
    },
    caption: {
      fontSize: "0.7rem",
      lineHeight: 1.43,
      "@media (min-width:600px)": {
        fontSize: "0.75rem",
      },
    },
    overline: {
      fontSize: "0.65rem",
      fontWeight: 500,
      lineHeight: 1.43,
      textTransform: "uppercase",
      "@media (min-width:600px)": {
        fontSize: "0.7rem",
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: "none",
          padding: "6px 16px",
          "&.MuiButton-containedInherit": {
            backgroundColor: "#444653",
            color: "#FFFFFF",
            "&:hover": {
              backgroundColor: "#363742",
            },
          },
        },
        containedPrimary: {
          backgroundColor: "#2E5FFF",
          color: "#FFFFFF",
          "&:hover": {
            backgroundColor: "#2048CC",
          },
        },
        containedSecondary: {
          backgroundColor: "#27EDB9",
          color: "#004735",
          "&:hover": {
            backgroundColor: "#1BA581",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          height: 40,
          "& .MuiChip-label": {
            padding: "10px 16px 10px 16px",
            fontWeight: 500,
          },
        },
        outlined: {
          borderColor: "#757685",
          color: "#003BC4",
          "& .MuiChip-label": {
            color: "#003BC4",
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#F5F5F5",
            borderRadius: 20,
            "& fieldset": {
              borderColor: "transparent",
            },
            "&:hover fieldset": {
              borderColor: "#E0E0E0",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#2E5FFF",
            },
          },
        },
      },
    },
  },
});

export default theme;
