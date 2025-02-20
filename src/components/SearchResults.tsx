"use client";

import { Box, Card, CardContent, Typography, Stack } from "@mui/material";
import SquareChip from "@/components/SquareChip";

interface StudyResult {
  id: string;
  title: string;
  keywords: string[];
  description: string;
  hasVariables: boolean;
  hasCohortsAvailable: boolean;
  hasFreeAccess: boolean;
}

interface SearchResultsProps {
  results: StudyResult[];
}

export default function SearchResults({ results }: SearchResultsProps) {
  if (!results?.length) {
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
      {results.map((result) => (
        <Card
          key={result.id}
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "grey.200",
            "&:hover": {
              borderColor: "grey.300",
            },
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              {/* Logo placeholder - we'll add this later */}
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {result.title}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                  {result.keywords.map((keyword, index) => (
                    <Typography
                      key={index}
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        "&:not(:last-child):after": { content: '"•"', ml: 1 },
                      }}
                    >
                      {keyword}
                    </Typography>
                  ))}
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {result.description}
                </Typography>
                <Stack direction="row" spacing={1}>
                  {result.hasVariables && (
                    <SquareChip chipVariant="secondary" size="small">
                      Variable
                    </SquareChip>
                  )}
                  {result.hasCohortsAvailable && (
                    <SquareChip chipVariant="primary" size="small">
                      Cohorts Available
                    </SquareChip>
                  )}
                  {result.hasFreeAccess && (
                    <SquareChip chipVariant="dark" size="small">
                      Free Access
                    </SquareChip>
                  )}
                </Stack>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
