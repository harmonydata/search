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
  collapsed?: boolean;
  hasActiveSearch?: boolean; // Whether user has entered a search query or applied filters
}

export default function SearchResults({
  results,
  resourceTypeFilter,
  onSelectResult,
  selectedResultId,
  onFindSimilar,
  collapsed = false,
  hasActiveSearch = false,
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
      <Box sx={{ textAlign: "center", py: 8, maxWidth: 600, mx: "auto" }}>
        {!hasActiveSearch ? (
          // Initial state - no search or filters applied
          <Box>
            <Typography variant="h5" color="text.primary" gutterBottom>
              Harmony Search is here to help you find existing research studies
              in the UK
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Start by entering keywords in the search box above or browse our
              collection of research studies and datasets.
            </Typography>
          </Box>
        ) : (
          // User has searched/filtered but no results
          <Box>
            <Typography variant="h5" color="text.primary" gutterBottom>
              No results found
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              We couldn't find any studies matching your search criteria.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search terms, removing some filters, or
              broadening your criteria to find more results.
            </Typography>
          </Box>
        )}
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
