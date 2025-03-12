"use client";

import React from "react";
import Slider, { SliderProps } from "@mui/material/Slider";
import { styled } from "@mui/material/styles";

const FancySlider = styled(Slider)<SliderProps>(({ theme }) => ({
  mx: 2,
  padding: "11px 6px", // Vertical padding adjusted to center 32px thumb on 10px track
  "& .MuiSlider-track": {
    height: 10,
    borderRadius: 10, // Fully rounded track caps
    transition: "none", // Disable any transition on track
  },
  "& .MuiSlider-rail": {
    height: 10,
    borderRadius: 10,
    backgroundColor: theme.palette.secondary.main, // Use secondary color for inactive track
    opacity: 1, // Ensure full opacity
    transition: "none", // Remove fade effect
  },
  "& .MuiSlider-thumb": {
    height: 32, // Vertical thumb height
    width: 16, // Total width: 6px white on each side + 4px blue bar
    borderRadius: 2,
    backgroundColor: "#FFFFFF", // White container for the thumb
    top: "50%",
    transform: "translate(-50%, -50%)",
    boxShadow: "none",
    zIndex: 1,
    position: "absolute",
    // Render inner blue bar
    "&::before": {
      content: '""',
      position: "absolute",
      left: "50%",
      top: 0,
      transform: "translateX(-50%)",
      width: 4, // Blue bar width
      height: "100%",
      backgroundColor: theme.palette.primary.main,
      borderRadius: 2,
    },
    "&:focus, &:hover, &.Mui-active, &.Mui-focusVisible": {
      boxShadow: "none",
    },
  },
}));

const FancySliderComponent: React.FC<SliderProps> = (props) => {
  return <FancySlider {...props} />;
};

export default FancySliderComponent;
