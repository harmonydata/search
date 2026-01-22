"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Typography, Slider } from "@mui/material";
import { useSearch } from "@/contexts/SearchContext";

// Transform function: maps 0-1 to 0-10, with 0.5 mapping to 2
// Piecewise linear:
// - From 0 to 0.5: linear from 0 to 2, so f(x) = 4x
// - From 0.5 to 1: linear from 2 to 10, so f(x) = 16x - 6
function transformToApiValue(sliderValue: number): number {
  if (sliderValue <= 0.5) {
    return 4 * sliderValue;
  } else {
    return 16 * sliderValue - 6;
  }
}

// Inverse transform: maps 0-10 back to 0-1
function transformFromApiValue(apiValue: number): number {
  if (apiValue <= 2) {
    return apiValue / 4;
  } else {
    return (apiValue + 6) / 16;
  }
}

export default function DirectMatchWeightSlider() {
  const { searchSettings, updateSearchSettings } = useSearch();
  const [localValue, setLocalValue] = useState(
    searchSettings.directMatchWeight
  );
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Disable in trust estimate mode (has no effect)
  const isDisabled = searchSettings.paginationStrategy === "trust_estimate";

  // Sync local value when context value changes externally
  useEffect(() => {
    setLocalValue(searchSettings.directMatchWeight);
  }, [searchSettings.directMatchWeight]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = (event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    // Update local state immediately for responsive UI
    setLocalValue(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the context update (triggers search)
    debounceTimerRef.current = setTimeout(() => {
      updateSearchSettings({ directMatchWeight: value });
    }, 300); // 300ms delay after user stops sliding
  };

  // Calculate the API value for display
  const apiValue = transformToApiValue(localValue);

  return (
    <Box sx={{ mb: 2, opacity: isDisabled ? 0.5 : 1 }}>
      <Typography variant="body2" fontWeight={500} gutterBottom>
        Direct Match Weight: {localValue.toFixed(2)} (API: {apiValue.toFixed(1)}
        )
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        gutterBottom
        display="block"
      >
        {isDisabled 
          ? "Not available in Trust Estimate mode"
          : "Controls preference between direct match and variable match results"}
      </Typography>
      <Box sx={{ px: 2, mt: 2 }}>
        <Slider
          value={localValue}
          onChange={handleChange}
          disabled={isDisabled}
          min={0}
          max={1}
          step={0.01}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => value.toFixed(2)}
          marks={[
            { value: 0, label: "Variable" },
            { value: 0.5, label: "0.5" },
            { value: 1, label: "Direct" },
          ]}
        />
      </Box>
    </Box>
  );
}
