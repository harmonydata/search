"use client";

import { Box, Stack, Typography } from "@mui/material";
import { SearchResult } from "@/services/api";
import { ResourceData } from "@/components/ResourceCard";
import DatasetCard from "@/components/DatasetCard";
import VariableCard from "@/components/VariableCard";
import StudyCard from "@/components/StudyCard";
import SourceCard from "@/components/SourceCard";

interface SearchResultsProps {
  results: SearchResult[];
  resourceTypeFilter?: string[];
}

export default function SearchResults({
  results,
  resourceTypeFilter,
}: SearchResultsProps) {
  // Filter results based on resourceTypeFilter if provided, using case-insensitive comparison
  let filteredResults =
    resourceTypeFilter && resourceTypeFilter.length > 0
      ? results.filter((result) =>
          result.resource_type && resourceTypeFilter
            .map((type) => type.trim().toLowerCase())
            .includes(result.resource_type.trim().toLowerCase())
        )
      : results;

  // Sort filtered results by score (highest score on top), defaulting score to 0 if undefined
  const sortedResults = filteredResults.sort((a, b) => {
    const scoreA = a.score || 0;
    const scoreB = b.score || 0;
    return scoreB - scoreA;
  });

  // Debug log to inspect filtering and sorting
  console.log("SearchResults debug:", {
    resourceTypeFilter,
    originalResults: results,
    filteredResults,
    sortedResults,
  });

  if (!sortedResults.length) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography color="text.secondary">
          No results found. Try adjusting your search criteria.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {sortedResults.map((result) => {
        // Handle potentially undefined resource_type with a default fallback
        const resourceType = result.resource_type?.trim().toLowerCase() || '';
        
        if (resourceType === "dataset") {
          return (
            <DatasetCard
              key={result.id || `dataset-${Math.random()}`}
              dataset={result as unknown as ResourceData}
            />
          );
        } else if (resourceType === "variable") {
          return (
            <VariableCard
              key={result.id || `variable-${Math.random()}`}
              variable={result as unknown as ResourceData}
            />
          );
        } else if (resourceType === "study") {
          return (
            <StudyCard
              key={result.id || `study-${Math.random()}`}
              study={result as unknown as ResourceData}
            />
          );
        } else if (resourceType === "source") {
          return (
            <SourceCard
              key={result.id || `source-${Math.random()}`}
              source={result as unknown as ResourceData}
            />
          );
        } else {
          console.log("Non supported resource type:", result);
          return null;
        }
      })}
    </Stack>
  );
}
