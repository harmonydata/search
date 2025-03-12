"use client";
import React, { Suspense } from "react";
import { useState, useEffect, useMemo } from "react";
import { Box, Container, TextField, Button, Typography } from "@mui/material";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import SearchResults from "@/components/SearchResults";
import FilterPanel from "@/components/FilterPanel";
import StudyDetail from "@/components/StudyDetail";
import {
  fetchSearchResults,
  SearchResponse,
  SearchResult,
  AggregateFilter,
} from "@/services/api";
import { useSearchParams } from "next/navigation";

// Function to capitalize filter labels
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

// Sample study detail remains static for now
const sampleStudyDetail = {
  title: "1958 National Child Development Study (NCDS)",
  description:
    "The 1958 National Child Development Study (NCDS) is a multidisciplinary national longitudinal birth cohort study following the lives of over 17,000 people born in 1958. The study aims to improve understanding of the factors affecting human development over the whole lifespan. Follows histories of health, wealth, education, family and employment from early life with linked biomedical and examination performance data integrated into the study.",
  dataOwner: {
    name: "Centre for Longitudinal Studies",
    logo: "/logos/cls.png",
  },
  geographicCoverage: "England, Scotland, Wales",
  startDate: "1958",
  sampleSizeAtRecruitment: "17,000+",
  sampleSizeAtMostRecentSweep: "9,337",
  ageAtRecruitment: "Birth",
  topics: [
    "Depression",
    "Anxiety",
    "Obesity",
    "ADHD",
    "Smoking",
    "Autism",
    "Poverty",
    "Nutrition",
    "Benefits",
    "Dyslexia",
    "Speech",
    "Literacy",
    "Behaviour",
  ],
  instruments: [
    "GAD-7",
    "Rutter Parent",
    "BSAG",
    "Rutter Teacher",
    "Malaise Inventory",
    "CAGE",
    "GHQ-12",
  ],
  dataAccess: {
    service: "UK Data Service",
    logo: "/logos/ukds.png",
  },
  itemLevelMetadata: [
    {
      name: "Catalogue for Mental Health Measures",
      logo: "/logos/cmhm.png",
    },
    {
      name: "Closer",
      logo: "/logos/closer.png",
    },
    {
      name: "UK LLC",
      logo: "/logos/uk-llc.png",
    },
  ],
};

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading Discover Content...</div>}>
      <DiscoverPageContent />
    </Suspense>
  );
}

function DiscoverPageContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<AggregateFilter[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const resourceType = searchParams.get("resource_type");
  const resourceTypeFilter = useMemo(() => (resourceType ? [resourceType] : []), [resourceType]);

  async function performSearch() {
    setLoading(true);
    try {
      const combinedFilters = { ...selectedFilters };
      if (resourceType) {
        combinedFilters.resource_type = [resourceType];
      }
      const res: SearchResponse = await fetchSearchResults(
        searchQuery,
        combinedFilters
      );
      
      // Set results from the API response
      setResults(res.results || []);
      
      // Transform aggregations from the new API format (object with nested objects)
      // to the format expected by the FilterPanel component (array of AggregateFilter)
      if (res.aggregations) {
        const aggregateFilters: AggregateFilter[] = Object.entries(res.aggregations)
          .filter(([key, value]) => typeof value === 'object' && !Array.isArray(value))
          .map(([key, value]) => ({
            id: key,
            label: capitalize(key),
            options: Object.keys(value as unknown as Record<string, any>),
          }));
        setFilters(aggregateFilters);
      } else {
        setFilters([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    performSearch();
  }, [searchQuery, selectedFilters, resourceTypeFilter]);

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="xl">
        {/* Search Section */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 4 }}>
          <TextField
            fullWidth
            placeholder="What are you searching for?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              endAdornment: (
                <Box sx={{ mr: 1, ml: -0.5 }}>
                  <Image src="/icons/discover.svg" alt="Search" width={20} height={20} />
                </Box>
              ),
              sx: {
                height: 48,
                "& .MuiOutlinedInput-root": { borderRadius: 24 },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "grey.200" },
              },
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 24 } }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              sx={{ minWidth: 0, width: 40, height: 40, borderRadius: "50%", p: 0 }}
            >
              <ChevronDown size={14} style={{ fill: "#004735", stroke: "none" }} />
            </Button>
            <Typography sx={{ color: "#191B22", fontWeight: 500, whiteSpace: "nowrap" }}>
              Advanced Search
            </Typography>
          </Box>
        </Box>

        {/* Filter Panel updated with aggregations from search */}
        <FilterPanel
          filtersData={filters}
          onSelectionChange={(category, selectedOptions) =>
            setSelectedFilters((prev) => ({ ...prev, [category]: selectedOptions }))
          }
        />

        {/* Main Content Area */}
        <Box sx={{ display: "flex", gap: 4 }}>
          {/* Search Results Panel */}
          <Box sx={{ width: "50%", minWidth: 0 }}>
            {loading ? (
              <Typography>Loading search results...</Typography>
            ) : (
              <SearchResults results={results} resourceTypeFilter={resourceTypeFilter} />
            )}
          </Box>

          {/* Study Detail Panel */}
          <Box
            sx={{
              width: "50%",
              bgcolor: "background.paper",
              borderLeft: "1px solid",
              borderColor: "grey.200",
              height: "calc(100vh - 200px)",
              position: "sticky",
              top: 24,
            }}
          >
            <StudyDetail study={sampleStudyDetail} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
} 