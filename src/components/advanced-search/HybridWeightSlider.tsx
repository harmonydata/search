"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Typography, Slider } from "@mui/material";
import { useSearch } from "@/contexts/SearchContext";

export default function HybridWeightSlider() {
  const { searchSettings, updateSearchSettings } = useSearch();
  const [localValue, setLocalValue] = useState(searchSettings.hybridWeight);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when context value changes externally
  useEffect(() => {
    setLocalValue(searchSettings.hybridWeight);
  }, [searchSettings.hybridWeight]);

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
      updateSearchSettings({ hybridWeight: value });
    }, 300); // 300ms delay after user stops sliding
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" fontWeight={500} gutterBottom>
        Hybrid Weight: {localValue.toFixed(2)}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        gutterBottom
        display="block"
      >
        Controls the balance between semantic and keyword search
      </Typography>
      <Box sx={{ px: 2, mt: 2 }}>
        <Slider
          value={localValue}
          onChange={handleChange}
          min={0}
          max={1}
          step={0.01}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => value.toFixed(2)}
          marks={[
            { value: 0, label: "Keyword" },
            { value: 0.5, label: "Balanced" },
            { value: 1, label: "Semantic" },
          ]}
        />
      </Box>
    </Box>
  );
}
