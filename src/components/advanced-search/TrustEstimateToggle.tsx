"use client";

import { Box, Typography, FormControlLabel, Switch } from "@mui/material";
import { useSearch } from "@/contexts/SearchContext";

export default function TrustEstimateToggle() {
  const { searchSettings, updateSearchSettings } = useSearch();

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateSearchSettings({ trustEstimate: event.target.checked });
  };

  return (
    <Box sx={{ mb: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={searchSettings.trustEstimate}
            onChange={handleToggle}
            color="primary"
          />
        }
        label={
          <Box>
            <Typography variant="body2" fontWeight={500}>
              Trust Estimate
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Use estimate UUIDs and batch lookup results
            </Typography>
          </Box>
        }
      />
    </Box>
  );
}
