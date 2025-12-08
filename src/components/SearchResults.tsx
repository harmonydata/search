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
  onReportResult?: (result: SearchResult, index: number) => void;
  collapsed?: boolean;
  hasActiveSearch?: boolean; // Whether user has entered a search query or applied filters
}

export default function SearchResults({
  results,
  resourceTypeFilter,
  onSelectResult,
  selectedResultId,
  onFindSimilar,
  onReportResult,
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

  const handleSelectResult = (result: SearchResult) => {
    if (onSelectResult) {
      onSelectResult(result);
    }
  };

  if (!filteredResults.length) {
    return (
      <Box sx={{ textAlign: "center", py: 8, maxWidth: 600, mx: "auto" }}>
        {!hasActiveSearch ? (
          // Initial state - no search or filters applied - should not happen since hero banner is now at page level
          <Box sx={{ textAlign: "center", py: 8, maxWidth: 600, mx: "auto" }}>
            <Typography variant="h5" color="text.primary" gutterBottom>
              No Results
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enter a search term or apply filters to find studies.
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
              onReportResult={
                onReportResult ? () => onReportResult(result, index) : undefined
              }
            />
          );
        })}
      </Stack>
    </Box>
  );
}
