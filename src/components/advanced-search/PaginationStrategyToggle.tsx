"use client";

import { Box, Typography, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { useSearch } from "@/contexts/SearchContext";

export default function PaginationStrategyToggle() {
  const { searchSettings, updateSearchSettings } = useSearch();

  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newStrategy: "filter" | "offset" | null
  ) => {
    if (newStrategy !== null) {
      updateSearchSettings({ paginationStrategy: newStrategy });
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" gutterBottom display="block">
        Pagination Strategy:
      </Typography>
      <ToggleButtonGroup
        value={searchSettings.paginationStrategy}
        exclusive
        onChange={handleChange}
        aria-label="pagination strategy"
        size="small"
        fullWidth
      >
        <ToggleButton value="filter" aria-label="filter">
          Filter
        </ToggleButton>
        <ToggleButton value="offset" aria-label="offset">
          Offset
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
