"use client";

import { Button, ButtonProps } from "@mui/material";
import { styled } from "@mui/material/styles";

interface SquareChipProps extends Omit<ButtonProps, "color"> {
  chipVariant?: "primary" | "secondary" | "dark";
}

const SquareChip = styled(Button, {
  shouldForwardProp: (prop) => prop !== "chipVariant",
})<SquareChipProps>(({ theme, chipVariant = "primary" }) => ({
  borderRadius: 8,
  textTransform: "none",
  padding: "0 16px",
  height: 32,
  minHeight: 32,
  fontSize: "0.875rem",
  fontWeight: 500,
  whiteSpace: "nowrap",
  lineHeight: 1,
  ...(chipVariant === "primary" && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
  }),
  ...(chipVariant === "secondary" && {
    backgroundColor: theme.palette.secondary.main,
    color: theme.palette.secondary.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.secondary.dark,
    },
  }),
  ...(chipVariant === "dark" && {
    backgroundColor: "#444653",
    color: "#FFFFFF",
    "&:hover": {
      backgroundColor: "#363742",
    },
  }),
}));

export default SquareChip;
