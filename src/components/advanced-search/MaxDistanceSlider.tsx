"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Typography, Slider, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { useSearch } from "@/contexts/SearchContext";

export default function MaxDistanceSlider() {
  const { searchSettings, updateSearchSettings } = useSearch();
  const [localValue, setLocalValue] = useState(searchSettings.maxDistance);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when context value changes externally
  useEffect(() => {
    setLocalValue(searchSettings.maxDistance);
  }, [searchSettings.maxDistance]);

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
      updateSearchSettings({ maxDistance: value });
    }, 300); // 300ms delay after user stops sliding
  };

  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: "max_distance" | "min_score" | "both" | null
  ) => {
    if (newMode !== null) {
      updateSearchSettings({ maxDistanceMode: newMode });
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" fontWeight={500} gutterBottom>
        Max Distance: {localValue.toFixed(2)}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        gutterBottom
        display="block"
      >
        Controls the maximum vector distance for semantic search results
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
            { value: 0, label: "0" },
            { value: 0.4, label: "0.4" },
            { value: 1, label: "1" },
          ]}
        />
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Distance Strategy:
        </Typography>
        <ToggleButtonGroup
          value={searchSettings.maxDistanceMode}
          exclusive
          onChange={handleModeChange}
          aria-label="max distance mode"
          size="small"
          fullWidth
        >
          <ToggleButton value="max_distance" aria-label="max distance">
            Max Distance
          </ToggleButton>
          <ToggleButton value="min_score" aria-label="min score">
            Min Score
          </ToggleButton>
          <ToggleButton value="both" aria-label="both">
            Both
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
}
