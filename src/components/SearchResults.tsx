"use client";

import { Box, Stack, Typography, Button } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { SearchResult } from "@/services/api";
import CompactResultCard from "@/components/CompactResultCard";
import { SearchX } from "lucide-react";

interface SearchResultsProps {
  results: SearchResult[];
  resourceTypeFilter?: string[];
  onSelectResult?: (result: SearchResult) => void;
  selectedResultId?: string;
  onFindSimilar?: (result: SearchResult) => void;
  onReportResult?: (result: SearchResult, index: number) => void;
  collapsed?: boolean;
  hasActiveSearch?: boolean; // Whether user has entered a search query or applied filters
  loading?: boolean; // Whether a search is currently in progress
  onClearQuery?: () => void; // Callback to clear the search query
  onClearFilters?: () => void; // Callback to clear all filters
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
  loading = false,
  onClearQuery,
  onClearFilters,
}: SearchResultsProps) {
  // Track if we've ever had results to detect initial search state
  const hasEverHadResults = useRef(false);

  // Update refs when state changes
  useEffect(() => {
    if (results.length > 0) {
      hasEverHadResults.current = true;
    }
  }, [results.length]);

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

  // Debug logging
  useEffect(() => {
    console.log("🔍 SearchResults render:", {
      filteredResultsLength: filteredResults.length,
      resultsLength: results.length,
      loading,
      hasActiveSearch,
      resourceTypeFilter,
      willShowNoResults: !filteredResults.length && !loading,
      willReturnNull: !filteredResults.length && loading,
    });
  }, [
    filteredResults.length,
    results.length,
    loading,
    hasActiveSearch,
    resourceTypeFilter,
  ]);

  // Track if we're in a transitional state (just started a search, loading might be starting)
  // This is only true when: hasActiveSearch is true, we haven't had results yet, AND loading is true
  // Once loading is false, we know the search has completed, so we should show results (or no results)
  const isTransitionalState =
    hasActiveSearch && !hasEverHadResults.current && loading;
  const shouldShowNoResults =
    !filteredResults.length && !loading && hasActiveSearch;

  // Add a small delay for transitional states to allow loading to be set
  // But if loading is false, show immediately (search has completed)
  const [showNoResults, setShowNoResults] = useState(false);
  const [previousLoading, setPreviousLoading] = useState(loading);

  useEffect(() => {
    // Track loading state changes
    setPreviousLoading(loading);
  }, [loading]);

  useEffect(() => {
    if (shouldShowNoResults) {
      // If loading just changed from true to false, show immediately (search completed)
      // Otherwise, add a small delay for transitional states
      const justFinishedLoading = previousLoading && !loading;
      const delay = justFinishedLoading ? 0 : isTransitionalState ? 100 : 0;
      const timer = setTimeout(() => {
        setShowNoResults(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setShowNoResults(false);
    }
  }, [shouldShowNoResults, isTransitionalState, loading, previousLoading]);

  if (!filteredResults.length && !loading && showNoResults) {
    console.log("🚫 Showing 'No results' message - conditions:", {
      filteredResultsLength: filteredResults.length,
      loading,
      hasActiveSearch,
      isTransitionalState,
      hasEverHadResults: hasEverHadResults.current,
    });

    const hasQuery = hasActiveSearch; // We'll check this more specifically
    const hasFilters = resourceTypeFilter && resourceTypeFilter.length > 0;

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
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mb: 3,
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SearchX
                  size={64}
                  style={{
                    color: "#9e9e9e",
                    opacity: 0.6,
                  }}
                />
              </Box>
            </Box>
            <Typography
              variant="h5"
              color="text.primary"
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              No results found
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              gutterBottom
              sx={{ mb: 4 }}
            >
              There are no results for your combination of query and filters.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="center"
              alignItems="center"
            >
              {onClearQuery && (
                <Button
                  variant="outlined"
                  onClick={onClearQuery}
                  sx={{
                    textTransform: "none",
                    minWidth: 140,
                    px: 3,
                    py: 1,
                  }}
                >
                  Remove query
                </Button>
              )}
              {onClearFilters && (
                <Button
                  variant="outlined"
                  onClick={onClearFilters}
                  sx={{
                    textTransform: "none",
                    minWidth: 140,
                    px: 3,
                    py: 1,
                  }}
                >
                  Remove filters
                </Button>
              )}
            </Stack>
          </Box>
        )}
      </Box>
    );
  }

  // Return null while loading to avoid showing "No results" message
  if (!filteredResults.length && loading) {
    console.log("⏳ Returning null - loading with no results");
    return null;
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
