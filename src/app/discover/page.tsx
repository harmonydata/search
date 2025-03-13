"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Box, Container, TextField, Button, Typography, Pagination, Drawer, IconButton, useMediaQuery, useTheme } from "@mui/material";
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import CloseIcon from '@mui/icons-material/Close';
import Image from "next/image";
import SearchResults from "@/components/SearchResults";
import FilterPanel from "@/components/FilterPanel";
import StudyDetail from "@/components/StudyDetail";
import {
  fetchSearchResults,
  fetchAggregateFilters,
  SearchResponse,
  SearchResult,
  AggregateFilter,
} from "@/services/api";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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

// Create a new component for the search functionality
function DiscoverPageContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg')); // 1200px breakpoint
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<AggregateFilter[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [totalHits, setTotalHits] = useState(0);
  // Commenting out pagination state for now
  // const [currentPage, setCurrentPage] = useState(1);
  const [showDebug, setShowDebug] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const resultsPerPage = 20; // Page size for the API
  
  const searchParams = useSearchParams();
  const resourceType = searchParams.get("resource_type");
  const resourceTypeFilter = useMemo(
    () => (resourceType ? [resourceType] : []),
    [resourceType]
  );

  // Debounce search query to prevent firing API calls on every keystroke
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay after user stops typing
    
    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  // Debug helper function to log current state to console
  const debugState = useCallback(() => {
    // Store state in window for later inspection
    if (typeof window !== 'undefined') {
      // @ts-ignore - Adding debug properties to window
      window.__debugState = {
        // currentPage,
        totalHits,
        resultsPerPage,
        searchQuery,
        debouncedSearchQuery,
        selectedFilters,
        filters,
        results,
        selectedResult
      };
      
      console.log('Current state stored in window.__debugState');
      console.log('Current state:', {
        pagination: { 
          // currentPage, 
          totalHits, 
          resultsPerPage, 
          // totalPages: Math.ceil(totalHits / resultsPerPage) 
        },
        searchQuery,
        debouncedSearchQuery,
        selectedFilters,
        filterCount: filters.length,
        resultCount: results.length,
        selectedResult: selectedResult ? {
          id: selectedResult.id,
          title: selectedResult.title || selectedResult.dataset_schema?.name
        } : null
      });
    }
  }, [
    // currentPage, 
    totalHits, resultsPerPage, searchQuery, debouncedSearchQuery, selectedFilters, filters, results, selectedResult
  ]);

  // Handle result selection
  const handleSelectResult = useCallback((result: SearchResult) => {
    console.log('Selected result:', result);
    setSelectedResult(result);
    // Open drawer on mobile when a result is selected
    if (isMobile) {
      setDrawerOpen(true);
    }
  }, [isMobile]);

  // Function to close the drawer
  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Toggle debug panel
  const toggleDebug = useCallback(() => {
    setShowDebug(prev => !prev);
    debugState();
  }, [debugState]);

  // Debug event to prevent console clearing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const preserveLog = (e: Event) => {
        if (e.target === window) {
          console.log('Preserving console log');
          e.stopPropagation();
          return false;
        }
        return true;
      };
      
      window.addEventListener('beforeunload', preserveLog, true);
      
      return () => {
        window.removeEventListener('beforeunload', preserveLog, true);
      };
    }
  }, []);

  // Fetch initial aggregations for filters - this should only happen once
  useEffect(() => {
    async function fetchInitialAggregations() {
      try {
        console.log("Fetching initial aggregations...");
        const aggregateData = await fetchAggregateFilters();
        const processedFilters = processAggregations(aggregateData);
        setFilters(processedFilters);
        console.log("Initial aggregations set:", processedFilters.length, "filters");
      } catch (error) {
        console.error("Failed to fetch initial aggregations:", error);
      }
    }
    
    fetchInitialAggregations();
  }, []);

  // Select the first result by default after search
  useEffect(() => {
    if (results.length > 0 && !selectedResult) {
      setSelectedResult(results[0]);
    } else if (results.length > 0 && selectedResult) {
      // If current selection is no longer in results, select the first result
      const stillExists = results.some(result => result.id === selectedResult.id);
      if (!stillExists) {
        setSelectedResult(results[0]);
      }
    } else if (results.length === 0) {
      setSelectedResult(null);
    }
  }, [results, selectedResult]);

  // Handle page change - commented out for now
  /*
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // This will trigger the search effect with the new page
  };
  */

  async function performSearch() {
    setLoading(true);
    try {
      // Create a copy of the filters to send to the API
      const combinedFilters = { ...selectedFilters };
      
      // Add resource_type filter if present in URL params
      if (resourceType) {
        combinedFilters.resource_type = [resourceType];
      }
      
      // Remove any empty filter arrays since they're unnecessary
      Object.keys(combinedFilters).forEach(key => {
        if (Array.isArray(combinedFilters[key]) && combinedFilters[key].length === 0) {
          delete combinedFilters[key];
        }
      });

      // Create a request ID for tracking this particular search request
      const requestId = `search-${Date.now()}`;
      console.group(`🔍 Search Request: ${requestId}`);
      console.log('Search query:', debouncedSearchQuery || '(empty)');
      console.log('Filters:', combinedFilters);
      console.log('Results per page:', resultsPerPage);
      // console.log('Page:', currentPage, 'Results per page:', resultsPerPage);
      
      const res: SearchResponse = await fetchSearchResults(
        debouncedSearchQuery,
        combinedFilters,
        // currentPage,
        resultsPerPage
      );
      
      // Log the response in a way that keeps it in the console
      console.log('Response received:', {
        requestId,
        numHits: res.num_hits,
        resultCount: res.results?.length || 0,
        // Use specific result properties that won't be too verbose
        results: res.results?.map(r => ({
          id: r.id, 
          title: r.title || r.dataset_schema?.name, 
          type: r.resource_type || r.dataset_schema?.["@type"],
          similarity: r.cosine_similarity
        })),
        timestamp: new Date().toISOString()
      });
      console.groupEnd();
      
      // Set results from the API response
      setResults(res.results || []);
      
      // Set total hits for pagination
      setTotalHits(res.num_hits || 0);
      
      // IMPORTANT: We do NOT update filters based on search results
      // This ensures filters remain stable and consistent during search
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }

  // Helper function to handle filter selection from FilterPanel
  const handleFilterSelection = (category: string, selectedOptions: string[]) => {
    // Just update the selected filters - the special case of age_range is handled in FilterPanel
    setSelectedFilters(prev => ({
      ...prev,
      [category]: selectedOptions
    }));
  };

  // Helper function to capitalize filter labels
  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
  }

  // Process aggregations to create filters - this should only be called with initial aggregation data
  const processAggregations = (aggs: Record<string, any>): AggregateFilter[] => {
    const aggregateFilters: AggregateFilter[] = [];

    // Define fields that should use range sliders
    const numericFields = [
      "sample_size",
      "age_lower",
      "age_upper",
      "start_year",
      "end_year",
      "duration_years",
      "num_variables",
      "num_sweeps",
    ];

    // Create a special combined age_range filter from age_lower and age_upper
    let ageMinValue = Infinity;
    let ageMaxValue = -Infinity;

    // Process each aggregation
    Object.entries(aggs).forEach(([field, data]) => {
      // Special handling for age fields to create combined filter
      if (field === "age_lower" || field === "age_upper" || field === "age_min" || field === "age_max") {
        const stats = data.statistics || {};
        
        // Extract min/max, handling possible different property names
        let minStat = stats.minimum;
        if (typeof minStat !== 'number' || !isFinite(minStat)) {
          minStat = stats.min;
        }
        
        let maxStat = stats.maximum;
        if (typeof maxStat !== 'number' || !isFinite(maxStat)) {
          maxStat = stats.max;
        }
        
        // Update age range based on both fields
        if (typeof minStat === 'number' && isFinite(minStat)) {
          ageMinValue = Math.min(ageMinValue, minStat);
        }
        
        if (typeof maxStat === 'number' && isFinite(maxStat)) {
          ageMaxValue = Math.max(ageMaxValue, maxStat);
        }
        
        return; // Skip individual age fields
      }
      
      // Handle numeric fields
      if (numericFields.includes(field)) {
        const stats = data.statistics || {};
                
        // Extract min value, handling possible different property names
        let minValue: number;
        if (typeof stats.minimum === 'number' && isFinite(stats.minimum)) {
          minValue = stats.minimum;
        } else if (typeof stats.min === 'number' && isFinite(stats.min)) {
          minValue = stats.min;
        } else {
          // Default fallbacks based on field type
          console.warn(`Missing valid min value for ${field}, using default`);
          if (field === "sample_size") {
            minValue = 0;
          } else if (field === "start_year" || field === "end_year") {
            minValue = 1900;
          } else if (field === "duration_years") {
            minValue = 0;
          } else if (field === "num_variables" || field === "num_sweeps") {
            minValue = 0;
          } else {
            minValue = 0;
          }
        }
        
        // Extract max value, handling possible different property names
        let maxValue: number;
        if (typeof stats.maximum === 'number' && isFinite(stats.maximum)) {
          maxValue = stats.maximum;
        } else if (typeof stats.max === 'number' && isFinite(stats.max)) {
          maxValue = stats.max;
        } else {
          // Default fallbacks based on field type
          console.warn(`Missing valid max value for ${field}, using default`);
          if (field === "sample_size") {
            maxValue = 100000;
          } else if (field === "start_year" || field === "end_year") {
            maxValue = 2024;
          } else if (field === "duration_years") {
            maxValue = 100;
          } else if (field === "num_variables") {
            maxValue = 10000;
          } else if (field === "num_sweeps") {
            maxValue = 50;
          } else {
            maxValue = 100;
          }
        }
        
        // Ensure max is greater than min
        if (maxValue <= minValue) {
          maxValue = minValue + 1;
        }
        
        // Create numeric range filter
        const options = Array.from(
          { length: 101 },
          (_, i) => String(minValue + (i / 100) * (maxValue - minValue))
        );
        
        aggregateFilters.push({
          id: field,
          label: field
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          type: "range",
          options,
        });
      } else {
        // Regular categorical filter
        const buckets = data.buckets || [];
        
        // Only add filter if there are options
        if (buckets.length > 0) {
          aggregateFilters.push({
            id: field,
            label: field
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase()),
            type: "multiselect",
            options: buckets.map((bucket: any) => bucket.key || ""),
          });
        }
      }
    });

    // Add combined age range filter if we have valid values
    if (isFinite(ageMinValue) && isFinite(ageMaxValue) && ageMinValue <= ageMaxValue) {
      // Ensure max is greater than min
      if (ageMaxValue <= ageMinValue) {
        ageMaxValue = ageMinValue + 1;
      }
      
      const ageOptions = Array.from(
        { length: 101 },
        (_, i) => String(ageMinValue + (i / 100) * (ageMaxValue - ageMinValue))
      );
      
      aggregateFilters.push({
        id: "age_range",
        label: "Age Range",
        type: "range",
        options: ageOptions,
      });
    } else {
      // Add default age range if we don't have valid values
      console.warn("Missing valid age range data, using defaults");
      const defaultAgeMin = 0;
      const defaultAgeMax = 100;
      
      const ageOptions = Array.from(
        { length: 101 },
        (_, i) => String(defaultAgeMin + (i / 100) * (defaultAgeMax - defaultAgeMin))
      );
      
      aggregateFilters.push({
        id: "age_range",
        label: "Age Range",
        type: "range",
        options: ageOptions,
      });
    }

    return aggregateFilters;
  };

  // Search only when debounced search query or selected filters change
  // This prevents excessive API calls during typing
  useEffect(() => {
    performSearch();
  }, [debouncedSearchQuery, selectedFilters, resourceTypeFilter 
    // , currentPage
  ]);

  // Calculate total pages for pagination display - commenting out for now
  // const totalPages = Math.ceil(totalHits / resultsPerPage);

  // Convert SearchResult to StudyDetail format
  const mapResultToStudyDetail = useCallback((result: SearchResult) => {
    // Extract data from result
    const title = result.dataset_schema?.name || result.title || "Untitled Dataset";
    const description = result.dataset_schema?.description || result.description || "";
    
    // Extract image - using type assertion to handle possible undefined
    const image = (result.dataset_schema as any)?.image || (result as any).image || undefined;
    
    // Extract publisher with type safety
    let publisher: { name: string; url?: string; logo?: string } | undefined = undefined;
    if (result.dataset_schema?.publisher?.[0]?.name) {
      publisher = {
        name: result.dataset_schema.publisher[0].name,
        url: (result.dataset_schema.publisher[0] as any)?.url,
        logo: (result.dataset_schema.publisher[0] as any)?.logo,
      };
    }
    
    // Extract funders with type safety
    let funders: Array<{ name: string; url?: string; logo?: string }> | undefined = undefined;
    if (result.dataset_schema?.funder && Array.isArray(result.dataset_schema.funder)) {
      funders = result.dataset_schema.funder.map(funder => ({
        name: funder.name || "Funding Organization",
        url: (funder as any)?.url,
        logo: (funder as any)?.logo ,
      }));
    }
    
    // Geographic coverage
    const geographicCoverage = (result as any).geographic_coverage || 
                              (result.extra_data?.country_codes?.join(", ") || 
                               (result as any).country_codes?.join(", ")) || 
                              undefined;
    
    // Temporal coverage (from dataset_schema or start/end years)
    const temporalCoverage = result.dataset_schema?.temporalCoverage || 
                          ((result as any).start_year && 
                           `${(result as any).start_year}${(result as any).end_year ? `..${(result as any).end_year}` : ''}`);
    
    // Sample size
    const sampleSize = (result as any).sample_size?.toString() || 
                    ((result.dataset_schema as any)?.size?.toString()) || 
                    undefined;
    
    // Age coverage
    const ageLower = result.extra_data?.age_lower || (result as any).age_lower;
    const ageUpper = result.extra_data?.age_upper || (result as any).age_upper;
    const ageCoverage = (ageLower !== undefined && ageUpper !== undefined) 
                      ? `${ageLower} - ${ageUpper} years` 
                      : (ageLower !== undefined 
                         ? `${ageLower}+ years`
                         : (ageUpper !== undefined 
                            ? `0 - ${ageUpper} years`
                            : undefined));
    
    // Study design
    const studyDesign = result.extra_data?.study_design || (result as any).study_design || [];
    
    // Resource type
    const resourceType = (result as any).resource_type || result.dataset_schema?.["@type"] || undefined;
    
    // Topics and instruments
    const unfilteredTopics = result.dataset_schema?.keywords || 
                  (result as any).topics || 
                  [];
    
    // Filter out malformed keywords/topics that contain HTML fragments
    const topics = unfilteredTopics.filter(
      (topic: any) => typeof topic === 'string' && !topic.includes('<a title=') && !topic.startsWith('<')
    );
    
    const instruments = (result as any).instruments || [];
    
    // Extract variables that matched the search query
    const matchedVariables = result.variables_which_matched || [];
    
    // Extract all variables from dataset schema
    const allVariables = result.dataset_schema?.variableMeasured || [];
    
    // Data catalogs from includedInDataCatalog
    let dataCatalogs: Array<{ name: string; url?: string; logo?: string }> | undefined;
    
    if (result.dataset_schema?.includedInDataCatalog && result.dataset_schema.includedInDataCatalog.length > 0) {
      // Get dataset URLs if available
      const datasetUrls = result.dataset_schema.url || [];
      
      dataCatalogs = result.dataset_schema.includedInDataCatalog.map(catalog => {
        let catalogUrl = catalog.url;
        
        // Check if there's a more specific URL in the dataset's URL array that matches this catalog
        if (Array.isArray(datasetUrls) && catalogUrl) {
          try {
            // Extract the catalog domain
            const catalogDomain = new URL(catalogUrl).hostname;
            
            // Find a URL in datasetUrls that has the same domain
            const matchingUrl = datasetUrls.find(urlStr => {
              try {
                const urlDomain = new URL(urlStr).hostname;
                return urlDomain === catalogDomain;
              } catch (e) {
                return false;
              }
            });
            
            // If found a matching URL, use that instead
            if (matchingUrl) {
              catalogUrl = matchingUrl;
            }
          } catch (e) {
            // If URL parsing fails, just use the original catalog URL
            console.warn("Failed to parse catalog URL", e);
          }
        }
        
        return {
          name: catalog.name || 'Data Catalog',
          url: catalogUrl || undefined,
          logo: catalog.image, // Fallback to a default logo
        };
      });
    }
    
    return {
      title,
      description,
      image,
      publisher,
      funders,
      geographicCoverage,
      temporalCoverage,
      sampleSize,
      ageCoverage,
      studyDesign,
      resourceType,
      topics,
      instruments,
      dataCatalogs,
      matchedVariables,
      allVariables,
    };
  }, []);

  // Define the StudyDetailContent component to avoid repetition
  const StudyDetailContent = ({ isDrawerView = false }) => (
    selectedResult ? (
      <StudyDetail study={mapResultToStudyDetail(selectedResult)} isDrawerView={isDrawerView} />
    ) : (
      <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">
          Select a dataset to view details
        </Typography>
      </Box>
    )
  );

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="xl">
        {/* Search Section */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 4 }}>
          <TextField
            fullWidth
            placeholder="What are you searching for?"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // setCurrentPage(1); // Reset to first page on new search
            }}
            InputProps={{
              endAdornment: (
                <Box sx={{ mr: 1, ml: -0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  {searchQuery !== debouncedSearchQuery && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      Typing...
                    </Typography>
                  )}
                  <Image
                    src="/icons/discover.svg"
                    alt="Search"
                    width={20}
                    height={20}
                  />
                </Box>
              ),
              sx: {
                height: 48,
                "& .MuiOutlinedInput-root": { borderRadius: 24 },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "grey.200",
                },
              },
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 24 } }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              sx={{
                minWidth: 0,
                width: 40,
                height: 40,
                borderRadius: "50%",
                p: 0,
              }}
            >
              <ArrowDropDownIcon />
            </Button>
            <Typography
              sx={{ color: "#191B22", fontWeight: 500, whiteSpace: "nowrap" }}
            >
              Advanced Search
            </Typography>
          </Box>
        </Box>

        {/* Filter Panel with initial filters */}
        <FilterPanel
          filtersData={filters}
          onSelectionChange={handleFilterSelection}
        />
        
        {/* Debug button - only visible in development */}
        {process.env.NODE_ENV !== 'production' && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={toggleDebug}
              sx={{ 
                fontSize: '0.7rem',
                textTransform: 'none',
                py: 0.5
              }}
            >
              {showDebug ? 'Hide Debug Info' : 'Debug API Responses'}
            </Button>
          </Box>
        )}
        
        {/* Debug panel */}
        {showDebug && (
          <Box sx={{ mb: 4, p: 2, border: '1px dashed', borderColor: 'grey.300', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>Debug Information</Typography>
            <Typography variant="body2">
              API responses are saved to:
              <ul>
                <li><code>window.__lastSearchResponse</code> - Latest search response</li>
                <li><code>window.__lastAggregateResponse</code> - Latest aggregations response</li>
                <li><code>window.__debugState</code> - Current component state</li>
              </ul>
              
              <strong>Current Search:</strong> {debouncedSearchQuery || '(empty)'}<br />
              <strong>Total hits:</strong> {totalHits}<br />
              {/* <strong>Page:</strong> {currentPage} of {Math.ceil(totalHits / resultsPerPage)} (Total hits: {totalHits})<br /> */}
              <strong>Selected Filters:</strong> {Object.keys(selectedFilters).length > 0 
                ? Object.keys(selectedFilters).map(k => `${k} (${selectedFilters[k].length})`).join(', ') 
                : 'None'}
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => {
                debugState();
                // Copy debug information to clipboard
                const debugInfo = JSON.stringify({
                  search: debouncedSearchQuery,
                  // page: currentPage,
                  totalHits,
                  selectedFilters
                }, null, 2);
                navigator.clipboard.writeText(debugInfo);
                alert('Debug info copied to clipboard');
              }}
              sx={{ mt: 1, mr: 1 }}
            >
              Copy Debug Info
            </Button>
            <Button 
              variant="outlined" 
              color="error"
              size="small" 
              onClick={() => {
                console.clear();
                performSearch();
              }}
              sx={{ mt: 1 }}
            >
              Clear & Reload
            </Button>
          </Box>
        )}

        {/* Main Content Area - Responsive Layout */}
        <Box 
          sx={{ 
            display: "flex", 
            gap: 4,
            flexDirection: isMobile ? "column" : "row" 
          }}
        >
          {/* Search Results Panel - Full width on mobile */}
          <Box 
            sx={{ 
              width: isMobile ? "100%" : "50%", 
              minWidth: 0 
            }}
          >
            {loading ? (
              <Typography>Loading search results...</Typography>
            ) : (
              <>
                <SearchResults
                  results={results}
                  resourceTypeFilter={resourceTypeFilter}
                  onSelectResult={handleSelectResult}
                  selectedResultId={selectedResult?.id}
                />
                
                {/* Simple results count info */}
                {totalHits > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {totalHits} total results (showing up to {resultsPerPage})
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* Study Detail Panel - Only shown on desktop */}
          {!isMobile && (
            <Box
              sx={{
                width: "50%",
                bgcolor: "background.paper",
                borderLeft: "1px solid",
                borderColor: "grey.200",
                height: "auto", // Remove fixed height
                position: "sticky",
                top: 24, // Distance from top of viewport
                maxHeight: "calc(100vh - 48px)", // Full viewport height minus margins
                display: "flex",
                flexDirection: "column",
              }}
            >
              <StudyDetailContent />
            </Box>
          )}
        </Box>

        {/* Mobile Drawer for Study Details */}
        <Drawer
          anchor="right"
          open={isMobile && drawerOpen}
          onClose={handleCloseDrawer}
          sx={{
            '& .MuiDrawer-paper': { 
              width: { xs: '100%', sm: '80%', md: '60%' }, 
              maxWidth: '600px',
              p: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            },
          }}
        >
          <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'grey.200', p: 1 }}>
            <IconButton 
              onClick={handleCloseDrawer}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              <CloseIcon />
            </IconButton>
            <Box sx={{ py: 1, pl: 1, pr: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ flex: 1 }}>
                {selectedResult ? selectedResult.title || selectedResult.dataset_schema?.name || "Study Details" : "Study Details"}
              </Typography>
              {selectedResult && (
                (selectedResult.dataset_schema && (selectedResult.dataset_schema as any).image) || 
                ((selectedResult as any).image) 
              ) && (
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    position: "relative",
                    borderRadius: "4px",
                    overflow: "hidden",
                    flexShrink: 0
                  }}
                >
                  <Image
                    src={(selectedResult.dataset_schema && (selectedResult.dataset_schema as any).image) || 
                         (selectedResult as any).image}
                    alt={selectedResult.title || "Study image"}
                    fill
                    style={{ objectFit: "cover" }}
                    unoptimized={true}
                  />
                </Box>
              )}
            </Box>
          </Box>
          <Box sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <StudyDetailContent isDrawerView={true} />
          </Box>
        </Drawer>
      </Container>
    </Box>
  );
}

// Main page component with Suspense boundary
export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ p: 4 }}>
          <Typography>Loading...</Typography>
        </Box>
      }
    >
      <DiscoverPageContent />
    </Suspense>
  );
}
