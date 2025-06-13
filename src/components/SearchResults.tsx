"use client";

import { Box, Stack, Typography } from "@mui/material";
import { SearchResult } from "@/services/api";
import CompactResultCard from "@/components/CompactResultCard";

interface SearchResultsProps {
  results: SearchResult[];
  resourceTypeFilter?: string[];
  onSelectResult?: (result: SearchResult) => void;
  selectedResultId?: string;
  onFindSimilar?: (result: SearchResult) => void;
}

export default function SearchResults({
  results,
  resourceTypeFilter,
  onSelectResult,
  selectedResultId,
  onFindSimilar,
}: SearchResultsProps) {
  // Filter results based on resourceTypeFilter if provided, using case-insensitive comparison
  const filteredResults =
    resourceTypeFilter && resourceTypeFilter.length > 0
      ? results.filter(
          (result) =>
            result.extra_data?.resource_type &&
            resourceTypeFilter
              .map((type) => type.trim().toLowerCase())
              .includes(result.extra_data?.resource_type.trim().toLowerCase())
        )
      : results;

  // Debug log to inspect filtering (removed sorting as API returns results in correct order)
  console.log("SearchResults debug:", {
    resourceTypeFilter,
    originalResults: results,
    filteredResults,
  });

  const handleSelectResult = (result: SearchResult) => {
    if (onSelectResult) {
      onSelectResult(result);
    }
  };

  if (!filteredResults.length) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography color="text.secondary">
          No results found. Try adjusting your search criteria.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={1.5} sx={{ mb: 4 }}>
        {filteredResults.map((result, index) => {
          // Determine if this result is selected
          const isSelected = selectedResultId === result.extra_data?.uuid;

          return (
            <CompactResultCard
              key={result.extra_data?.uuid || `result-${index}`}
              result={result}
              isSelected={isSelected}
              onClick={() => handleSelectResult(result)}
              onFindSimilar={onFindSimilar}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
