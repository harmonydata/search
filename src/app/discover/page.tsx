"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  startTransition,
} from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Drawer,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import Image from "next/image";
import SearchResults from "@/components/SearchResults";
import FilterPanel from "@/components/FilterPanel";
import StudyDetail from "@/components/StudyDetail";
import FeedbackButton from "@/components/FeedbackButton";
import HeroBanner from "@/components/HeroBanner";
import SearchFeedbackDialog, {
  SearchFeedbackData,
} from "@/components/SearchFeedbackDialog";
import { submitSearchFeedback } from "@/services/feedback";
import { Bug } from "lucide-react";
import ComingSoonDialog from "@/components/ComingSoonDialog";
import {
  fetchSearchResults,
  fetchAggregateFilters,
  fetchResultByUuid,
  SearchResponse,
  SearchResult,
  AggregateFilter,
} from "@/services/api";
import { submitFeedback } from "@/services/feedback";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore/lite";
import { db } from "../../firebase";
import { Bookmark } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Database,
  File,
  Book,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdvancedSearchDropdown from "@/components/AdvancedSearchDropdown";
import { getAssetPrefix } from "@/lib/utils/shared";
import InfiniteScroll from "react-infinite-scroll-component";
import { useRouter } from "next/navigation";

// Create a new component for the search functionality
function DiscoverPageContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // 600px breakpoint
  const isTablet = useMediaQuery(theme.breakpoints.down("lg")); // 1200px breakpoint
  const { searchSettings, updateQuery, updateSearchSettings } = useSearch();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<AggregateFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalHits, setTotalHits] = useState(0);
  const [isResultCountLowerBound, setIsResultCountLowerBound] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerImageError, setDrawerImageError] = useState(false);

  // Desktop expansion state
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [apiOffline, setApiOffline] = useState(false);
  const [similarStudy, setSimilarStudy] = useState<SearchResult | null>(null);

  // State for tracking search performance
  const [lastSearchTime, setLastSearchTime] = useState<number | null>(null);
  const [lastApiTime, setLastApiTime] = useState<number | null>(null);

  // State for new pagination logic with deduplication
  const [topLevelIdsSeen, setTopLevelIdsSeen] = useState<string[]>([]);
  const [nextPageOffset, setNextPageOffset] = useState<number | undefined>(
    undefined
  );
  // Track consecutive empty calls - need 2 consecutive empty calls to stop
  const [consecutiveEmptyCalls, setConsecutiveEmptyCalls] = useState(0);

  const [savingSearch, setSavingSearch] = useState(false);
  const [saveSearchSuccess, setSaveSearchSuccess] = useState(false);

  // Search feedback dialog state
  const [searchFeedbackOpen, setSearchFeedbackOpen] = useState(false);
  const [selectedResultForFeedback, setSelectedResultForFeedback] =
    useState<SearchResult | null>(null);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);

  // Coming soon dialog state
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState<string>("");

  const resultsPerPage = 50;

  const { currentUser } = useAuth();

  const searchParams = useSearchParams();
  const resourceType = searchParams.get("resource_type");
  const similarUid = searchParams.get("like");
  const router = useRouter();

  // Store initial URL params in refs for hero banner check
  const initialQueryRef = useRef(searchParams.get("query"));
  const initialTopicsRef = useRef(searchParams.getAll("topics"));
  const initialInstrumentsRef = useRef(searchParams.getAll("instruments"));
  const initialStudyDesignRef = useRef(searchParams.getAll("study_design"));

  const initialQuery = initialQueryRef.current;
  const initialTopics = initialTopicsRef.current;
  const initialInstruments = initialInstrumentsRef.current;
  const initialStudyDesign = initialStudyDesignRef.current;

  // URL initialization is now handled by SearchContext
  const resourceTypeFilter = useMemo(
    () => (resourceType ? [resourceType] : []),
    [resourceType]
  );

  // Refs to track previous query and filters for page reset logic
  const searchQueryRef = useRef(searchSettings.debouncedQuery);
  const filtersRef = useRef(JSON.stringify(searchSettings.selectedFilters));
  const useSearch2Ref = useRef(searchSettings.useSearch2);
  const hybridWeightRef = useRef(searchSettings.hybridWeight);
  const maxDistanceRef = useRef(searchSettings.maxDistance);
  const directMatchWeightRef = useRef(searchSettings.directMatchWeight);
  const topLevelIdsSeenRef = useRef(topLevelIdsSeen);
  const isResettingPageRef = useRef(false);

  // Ref to store the latest top_level_ids_seen_so_far immediately for next API call
  const currentTopLevelIdsRef = useRef<string[]>([]);

  // Ref to store the latest next_page_offset immediately for next API call
  const currentNextPageOffsetRef = useRef<number | undefined>(undefined);

  // Advanced search configuration is now handled directly by AdvancedSearchDropdown via SearchContext
  // Hybrid weight is manually controlled by the user (defaults to 0.5)

  // Handle result selection (works in both modes)
  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      setSelectedResult(result);
      if (isMobile) {
        setDrawerOpen(true);
      } else {
        // For tablet and desktop, expand the detail panel
        setIsDetailExpanded(true);
      }
    },
    [isMobile]
  );

  // Handle result selection
  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      console.log("Selected result:", result);
      handleResultSelect(result);
    },
    [handleResultSelect]
  );

  // Function to close the drawer
  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Handle detail area click for tablet/desktop expansion
  const handleDetailClick = useCallback(() => {
    if (!isMobile && selectedResult) {
      setIsDetailExpanded(true);
    }
  }, [isMobile, selectedResult]);

  // Handle collapse button click
  const handleCollapse = useCallback(() => {
    if (!isMobile) {
      setIsDetailExpanded((prev) => !prev);
    }
  }, [isMobile]);

  // Fetch initial aggregations for filters - this should only happen once
  useEffect(() => {
    async function fetchInitialAggregations() {
      try {
        console.log("Fetching initial aggregations...");
        setLoading(true);
        setApiOffline(false);

        // Create a promise that rejects after a timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("API request timed out")), 60000); // 60 seconds timeout
        });

        // Race the actual API call against the timeout
        const aggregateData = await Promise.race([
          fetchAggregateFilters(),
          timeoutPromise,
        ]);

        const processedFilters = processAggregations(aggregateData);
        setFilters(processedFilters);
        console.log(
          "Initial aggregations set:",
          processedFilters.length,
          "filters"
        );
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch initial aggregations:", error);
        setApiOffline(true);
        setLoading(false);
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
      const stillExists = results.some(
        (result) => result.extra_data?.uuid === selectedResult.extra_data?.uuid
      );
      if (!stillExists) {
        setSelectedResult(results[0]);
      }
    } else if (results.length === 0) {
      setSelectedResult(null);
    }
  }, [results, selectedResult]);

  // Reset drawer image error when selected result changes
  useEffect(() => {
    setDrawerImageError(false);
  }, [selectedResult]);

  // Helper function to determine which result to display (for variable results with ancestors)
  const getDisplayResult = useCallback((result: SearchResult) => {
    const isVariableResult =
      result.extra_data?.resource_type?.includes("variable");
    const hasAncestors =
      Array.isArray(result.ancestors) && result.ancestors.length > 0;
    return (
      (isVariableResult && hasAncestors && result.ancestors?.[0]) || result
    );
  }, []);

  // Save search function - currently shows coming soon dialog
  const saveSearch = async () => {
    // For initial launch, show coming soon dialog instead of saving
    setComingSoonFeature("Save Search");
    setComingSoonOpen(true);

    // Keep the original code commented for future use
    /*
    if (!currentUser || !searchSettings.query.trim() || savingSearch) return;

    setSavingSearch(true);
    setSaveSearchSuccess(false);
    try {
      const searchData = {
        query: searchSettings.query,
        filters: searchSettings.selectedFilters,
        useSearch2: searchSettings.useSearch2,
        hybridWeight: searchSettings.hybridWeight,
        maxDistance: searchSettings.maxDistance,
        selectedCategory: searchSettings.selectedCategory,
        resultCount: results.length,
        uid: currentUser.uid,
        created: serverTimestamp(),
      };
      console.log("Saving search:", searchData, db);
      await addDoc(collection(db, "saved_searches"), searchData);
      setSaveSearchSuccess(true);
    } catch (error) {
      console.error("Error saving search:", error);
    } finally {
      setSavingSearch(false);
    }
    */
  };

  // Simple state for study detail - no lookup logic here
  const [studyDetail, setStudyDetail] = useState<SearchResult | null>(null);

  // Update study detail when selected result changes - just pass the raw data
  useEffect(() => {
    if (!selectedResult) {
      setStudyDetail(null);
      return;
    }

    // Just pass the raw search result - StudyDetail component will handle its own lookup
    const displayResult = getDisplayResult(selectedResult);
    setStudyDetail(displayResult);
  }, [selectedResult, getDisplayResult]);

  // Effect to load similar study when UID is present
  useEffect(() => {
    async function loadSimilarStudy() {
      if (!searchSettings.similarUid) return;

      try {
        setLoading(true);
        const studyResult = await fetchResultByUuid(
          searchSettings.similarUid,
          undefined,
          undefined,
          searchSettings.maxDistance,
          searchSettings.maxDistanceMode
        );
        setSimilarStudy(studyResult);

        // Get description for similar search
        const description =
          studyResult.dataset_schema?.description ||
          studyResult.extra_data?.description;
        if (!description) {
          throw new Error("No description available for similar search");
        }

        // Set the search query to the description in SearchContext
        updateQuery(description);

        // Fetch similar studies
        // Adjust maxDistance based on page number (page 1, so no adjustment needed)
        const adjustedMaxDistance = getAdjustedMaxDistance(
          searchSettings.maxDistance,
          1
        );

        const searchResponse = await fetchSearchResults(
          description,
          {},
          1, // First page
          resultsPerPage,
          searchSettings.useSearch2,
          searchSettings.hybridWeight,
          undefined, // First page, no IDs seen yet
          undefined, // nextPageOffset
          undefined, // returnVariablesWithinParent
          adjustedMaxDistance, // maxVectorDistance - adjusted based on page number
          searchSettings.directMatchWeight, // directMatchWeight
          searchSettings.maxDistanceMode // maxDistanceMode
        );

        setResults(searchResponse.results || []);
        setTotalHits(searchResponse.num_hits || 0);
        setIsResultCountLowerBound(searchResponse.is_result_count_lower_bound || false);
      } catch (err) {
        console.error("Failed to load similar studies:", err);
        setApiOffline(true);
      } finally {
        setLoading(false);
      }
    }

    loadSimilarStudy();
  }, [
    searchSettings.similarUid,
    resultsPerPage,
    searchSettings.useSearch2,
    searchSettings.hybridWeight,
    updateQuery,
  ]);

  // Effect to trigger search when query, filters, or advanced search options change
  useEffect(() => {
    // Check if query, filters, or advanced search options changed (NOT page changes)
    const isSearchParameterChange =
      searchSettings.debouncedQuery !== searchQueryRef.current ||
      JSON.stringify(searchSettings.selectedFilters) !== filtersRef.current ||
      searchSettings.useSearch2 !== useSearch2Ref.current ||
      searchSettings.hybridWeight !== hybridWeightRef.current ||
      searchSettings.maxDistance !== maxDistanceRef.current ||
      searchSettings.directMatchWeight !== directMatchWeightRef.current;

    // If we're in similar studies mode, use the original description as the query
    const queryToUse = searchSettings.similarUid
      ? similarStudy?.dataset_schema?.description ||
        similarStudy?.extra_data?.description ||
        searchSettings.debouncedQuery
      : searchSettings.debouncedQuery;

    // Only clear results and reset for search parameter changes, NOT page changes
    if (isSearchParameterChange) {
      console.log(
        "🔍 Search parameters changed, clearing results and resetting to page 1"
      );

      // Set loading immediately to prevent "No results" message from showing
      console.log("⏳ Setting loading to true BEFORE clearing results");
      setLoading(true);

      // Clear results immediately when search parameters change
      console.log("🗑️ Clearing results array");
      setResults([]);
      // Reset pagination state for new search
      setTopLevelIdsSeen([]);
      currentTopLevelIdsRef.current = [];
      setNextPageOffset(undefined);
      currentNextPageOffsetRef.current = undefined;

      // Reset to page 1 if not already there
      if (currentPage !== 1) {
        setCurrentPage(1);
      }

      // Perform search with explicit page 1 to ensure correct offset
      performSearch(queryToUse, 1, {
        query: queryToUse,
        filters: searchSettings.selectedFilters,
        useSearch2: searchSettings.useSearch2,
        hybridWeight: searchSettings.hybridWeight,
        maxDistance: searchSettings.maxDistance,
        selectedCategory: searchSettings.selectedCategory,
        resourceType: searchSettings.resourceType,
        similarUid: searchSettings.similarUid,
      }).finally(() => {
        // Update refs only after search completes to prevent race conditions
        searchQueryRef.current = searchSettings.debouncedQuery;
        filtersRef.current = JSON.stringify(searchSettings.selectedFilters);
        useSearch2Ref.current = searchSettings.useSearch2;
        hybridWeightRef.current = searchSettings.hybridWeight;
        maxDistanceRef.current = searchSettings.maxDistance;
        directMatchWeightRef.current = searchSettings.directMatchWeight;
        topLevelIdsSeenRef.current = topLevelIdsSeen;
      });
    }
  }, [
    searchSettings.debouncedQuery,
    searchSettings.selectedFilters,
    searchSettings.similarUid,
    similarStudy,
    searchSettings.useSearch2,
    searchSettings.hybridWeight,
    searchSettings.maxDistance,
    searchSettings.directMatchWeight,
    // Remove currentPage from dependencies - page changes will be handled separately
  ]);

  // Separate effect to handle page changes for infinite scroll
  useEffect(() => {
    // Only handle page changes when we're not on page 1 (infinite scroll)
    if (currentPage > 1) {
      console.log("📄 Page changed to:", currentPage, "- loading more results");

      const queryToUse = searchSettings.similarUid
        ? similarStudy?.dataset_schema?.description ||
          similarStudy?.extra_data?.description ||
          searchSettings.debouncedQuery
        : searchSettings.debouncedQuery;

      // For page changes, don't clear results, just append
      performSearch(queryToUse, currentPage);
    }
  }, [currentPage]); // Only depend on currentPage

  // Function to load more results for infinite scroll
  const loadMore = useCallback(async () => {
    console.log("🔄 loadMore called:", {
      loadingMore,
      hasMoreResults,
      currentPage,
      resultsLength: results.length,
    });

    if (loadingMore || !hasMoreResults) {
      console.log("🔄 loadMore early return:", { loadingMore, hasMoreResults });
      return;
    }

    const nextPage = currentPage + 1;
    console.log("🔄 loadMore proceeding to page:", nextPage);

    // Just update the page - the page change effect will handle the rest
    setCurrentPage(nextPage);
  }, [loadingMore, hasMoreResults, currentPage]);

  // Helper function to adjust maxDistance based on page number
  // Gradually reduces maxDistance as page number increases to account for
  // vector distance normalization within the remaining search window
  const getAdjustedMaxDistance = (
    baseMaxDistance: number,
    page: number
  ): number => {
    if (page <= 1) {
      return baseMaxDistance;
    }
    // Reduce by 10% per page
    // Formula: maxDistance * (1 - (page - 1) * 0.1)
    const reductionFactor = 0.1; // 10% reduction per page
    const adjusted = baseMaxDistance * (1 - (page - 1) * reductionFactor);
    return Math.max(adjusted, 0); // Ensure non-negative, but allow values below 0.1
  };

  async function performSearch(
    query: string = searchSettings.debouncedQuery,
    forcePage?: number,
    searchParams?: {
      query?: string;
      filters?: Record<string, string[]>;
      useSearch2?: boolean;
      hybridWeight?: number;
      maxDistance?: number;
      directMatchWeight?: number;
      selectedCategory?: string | null;
      resourceType?: string | null;
      similarUid?: string | null;
    }
  ) {
    const pageToUse = forcePage !== undefined ? forcePage : currentPage;

    // Set appropriate loading state
    if (pageToUse === 1) {
      console.log("⏳ performSearch: Setting loading to true (page 1)");
      setLoading(true);
    } else {
      console.log("⏳ performSearch: Setting loadingMore to true (page > 1)");
      setLoadingMore(true);
    }

    setApiOffline(false);
    const searchStartTime = Date.now();

    // Reset infinite scroll state for new searches (page 1)
    if (pageToUse === 1) {
      setHasMoreResults(true);
      setLoadingMore(false);
      setConsecutiveEmptyCalls(0); // Reset consecutive empty calls counter
    }

    try {
      // Create a copy of the filters to send to the API
      const combinedFilters = { ...searchSettings.selectedFilters };

      // Add resource_type filter if present in URL params
      if (resourceType) {
        combinedFilters.resource_type = [resourceType];
      }

      // Remove any empty filter arrays since they're unnecessary
      Object.keys(combinedFilters).forEach((key) => {
        if (
          Array.isArray(combinedFilters[key]) &&
          combinedFilters[key].length === 0
        ) {
          delete combinedFilters[key];
        }
      });

      // Create a request ID for tracking this particular search request
      const requestId = `search-${Date.now()}`;
      console.group(`🔍 Search Request: ${requestId}`);
      console.log("Search query:", query || "(empty)");
      console.log("Filters:", combinedFilters);
      console.log("Page:", pageToUse);
      console.log("Results per page:", resultsPerPage);
      console.log("Use Search2:", searchSettings.useSearch2);
      console.log(
        "Similar UID (will be excluded):",
        searchSettings.similarUid || "None"
      );
      console.log(
        "Top Level IDs Seen:",
        pageToUse > 1 ? topLevelIdsSeen : "First page"
      );

      // Create a promise that rejects after a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("API request timed out")), 60000); // 60 seconds timeout
      });

      // Track API time specifically
      const apiStartTime = Date.now();

      // Determine what IDs to exclude from search results
      let idsToExclude: string[] | undefined;
      if (pageToUse > 1) {
        // For pagination, use the existing top level IDs to exclude
        idsToExclude = currentTopLevelIdsRef.current;
      } else if (searchSettings.similarUid) {
        // For similar study searches, exclude the original study
        idsToExclude = [searchSettings.similarUid];
        console.log(
          "Excluding original study from similar search:",
          searchSettings.similarUid
        );
      }

      // Adjust maxDistance based on page number to account for vector distance normalization
      const adjustedMaxDistance = getAdjustedMaxDistance(
        searchSettings.maxDistance,
        pageToUse
      );

      // Using exclusion filter method - always use offset 0
      const calculatedOffset = 0;
      
      // Race the actual API call against the timeout
      const res: SearchResponse = await Promise.race([
        fetchSearchResults(
          query,
          combinedFilters,
          pageToUse, // Use pageToUse instead of currentPage
          resultsPerPage,
          searchSettings.useSearch2,
          searchSettings.hybridWeight,
          idsToExclude, // Use the determined IDs to exclude (for pagination and similar searches)
          calculatedOffset, // Always 0 when using exclusion method
          undefined, // returnVariablesWithinParent
          adjustedMaxDistance, // maxVectorDistance - adjusted based on page number
          searchSettings.directMatchWeight, // directMatchWeight
          searchSettings.maxDistanceMode // maxDistanceMode
        ),
        timeoutPromise,
      ]);

      const apiEndTime = Date.now();
      const apiDuration = apiEndTime - apiStartTime;
      setLastApiTime(apiDuration);

      // Log the response in a way that keeps it in the console
      console.log("Response received:", {
        requestId,
        numHits: res.num_hits,
        resultCount: res.results?.length || 0,
        apiTime: `${apiDuration}ms`,
        // Use specific result properties that won't be too verbose
        results: res.results?.map((r) => ({
          id: r.extra_data?.uuid,
          title: r.dataset_schema?.name,
          type: r.extra_data?.resource_type || r.dataset_schema?.["@type"],
          similarity: r.cosine_similarity,
        })),
        timestamp: new Date().toISOString(),
      });
      console.groupEnd();

      // Handle results for infinite scroll
      const newResults = res.results || [];

      // Update topLevelIdsSeen with the new IDs from the response
      if (res.top_level_ids_seen_so_far) {
        console.log("Received top_level_ids_seen_so_far:", {
          count: res.top_level_ids_seen_so_far.length,
          sample: res.top_level_ids_seen_so_far.slice(0, 5),
          previousCount: topLevelIdsSeen.length,
        });
        // Update both state and ref immediately
        setTopLevelIdsSeen(res.top_level_ids_seen_so_far);
        currentTopLevelIdsRef.current = res.top_level_ids_seen_so_far;
      } else {
        console.log("No top_level_ids_seen_so_far in response");
      }

      // NOTE: We're now using offset-based pagination calculated from page number
      // We still track next_page_offset from response for potential future use, but don't rely on it
      if (res.next_page_offset !== undefined) {
        console.log("Received next_page_offset (tracked but not used):", {
          offset: res.next_page_offset,
          calculatedOffset: calculatedOffset,
        });
        // Update both state and ref for tracking (but we use calculated offset instead)
        setNextPageOffset(res.next_page_offset);
        currentNextPageOffsetRef.current = res.next_page_offset;
      }

      if (pageToUse === 1) {
        // First page - replace all results
        setResults(newResults);
        setTotalHits(res.num_hits || 0);
        setIsResultCountLowerBound(res.is_result_count_lower_bound || false);

        // URL updates are now handled by SearchContext

        // For new search endpoint (not useSearch2), determine hasMore based on offset pagination
        // For old search endpoint (useSearch2), use the traditional count-based logic
        if (!searchSettings.useSearch2) {
          // New offset-based pagination logic:
          // - Track consecutive empty calls
          // - Only stop when we get 2 consecutive empty calls (0 results)
          const numHits = res.num_hits || 0;
          
          if (newResults.length === 0) {
            // Got 0 results - increment consecutive empty calls counter
            const newConsecutiveEmpty = consecutiveEmptyCalls + 1;
            setConsecutiveEmptyCalls(newConsecutiveEmpty);
            
            // Only stop if we've had 2 consecutive empty calls
            const hasMore = newConsecutiveEmpty < 2;
            setHasMoreResults(hasMore);
            
            if (!hasMore) {
              // Two consecutive empty calls - we've reached the end
              setTotalHits(calculatedOffset);
            }
          } else {
            // Got results - reset consecutive empty calls counter
            setConsecutiveEmptyCalls(0);
            setHasMoreResults(true); // If we got any results, there might be more
            
            // Update totalHits - use num_hits if available
            if (numHits > 0) {
              setTotalHits(numHits);
              setIsResultCountLowerBound(res.is_result_count_lower_bound || false);
            } else if (totalHits === 0) {
              setTotalHits(-1); // Indicate unknown total
              setIsResultCountLowerBound(false);
            }
          }

          // Auto-load more pages if we got results but fewer than expected
          // Since API merges/restructures data, we might get fewer results even when more exist
          if (newResults.length > 0 && newResults.length < resultsPerPage) {
            // Define minimum thresholds for first page
            const minResultsThreshold = Math.min(20, resultsPerPage / 2); // At least 20 results or half the page size

            // Auto-load next page if we got fewer than minimum threshold
            // This ensures we try to get more results even if the API returned fewer than requested
            if (newResults.length < minResultsThreshold) {
              console.log(
                "🔄 Auto-loading next page from first page - got fewer results than threshold:",
                {
                  gotResults: newResults.length,
                  requestedResults: resultsPerPage,
                  minThreshold: minResultsThreshold,
                  numHits: numHits,
                  nextPage: 2,
                }
              );

              // Auto-trigger next page after a short delay to avoid rapid-fire requests
              setTimeout(() => {
                if (!loadingMore && hasMoreResults) {
                  console.log("🔄 Actually triggering page 2 load");
                  setCurrentPage(2);
                } else {
                  console.log("🔄 Skipping page 2 load - already loading more or no more results");
                }
              }, 100);
            }
          }
        } else {
          // Old pagination logic: based on count comparison
          setHasMoreResults(
            newResults.length === resultsPerPage &&
              newResults.length < (res.num_hits || 0)
          );
        }
      } else {
        // Additional pages - append to existing results
        setResults((prevResults) => {
          // Auto-load more pages if we don't have enough results (new pagination logic only)
          if (newResults.length > 0) {
            // Define minimum thresholds
            const minResultsThreshold = Math.min(20, resultsPerPage / 2); // At least 20 results or half the page size

            // Calculate the total results that will exist AFTER the state update
            let currentTotalResults;
            if (pageToUse === 1) {
              currentTotalResults = newResults.length;
            } else {
              currentTotalResults = prevResults.length + newResults.length;
            }

            // If we got fewer than expected results and haven't reached minimum threshold, auto-load next page
            if (
              newResults.length < resultsPerPage &&
              currentTotalResults < minResultsThreshold
            ) {
              console.log("🔄 Auto-loading next page - insufficient results:", {
                gotResults: newResults.length,
                requestedResults: resultsPerPage,
                currentTotal: currentTotalResults,
                minThreshold: minResultsThreshold,
                nextPage: pageToUse + 1,
              });

              // Auto-trigger next page after a short delay to avoid rapid-fire requests
              setTimeout(() => {
                if (!loadingMore && hasMoreResults) {
                  setCurrentPage(pageToUse + 1);
                }
              }, 100);
            }
          }
          return [...prevResults, ...newResults];
        });

        // For pagination: determine if we have more results based on offset pagination
        if (!searchSettings.useSearch2) {
          // New offset-based pagination logic:
          // - Track consecutive empty calls
          // - Only stop when we get 2 consecutive empty calls (0 results)
          const numHits = res.num_hits || 0;
          const totalResultsSoFar = results.length + newResults.length;
          
          if (newResults.length === 0) {
            // Got 0 results - increment consecutive empty calls counter
            const newConsecutiveEmpty = consecutiveEmptyCalls + 1;
            setConsecutiveEmptyCalls(newConsecutiveEmpty);
            
            // Only stop if we've had 2 consecutive empty calls
            const hasMore = newConsecutiveEmpty < 2;
            setHasMoreResults(hasMore);
            
            if (!hasMore) {
              // Two consecutive empty calls - we've reached the end
              setTotalHits(calculatedOffset);
            }
          } else {
            // Got results - reset consecutive empty calls counter
            setConsecutiveEmptyCalls(0);
            setHasMoreResults(true); // If we got any results, there might be more
            
            // Update totalHits - use num_hits if available
            if (numHits > 0) {
              setTotalHits(numHits);
              setIsResultCountLowerBound(res.is_result_count_lower_bound || false);
            } else if (totalHits === 0) {
              setTotalHits(-1); // Indicate unknown total
              setIsResultCountLowerBound(false);
            }
          }
        } else {
          // Old pagination logic: based on count comparison
          const hasMore = newResults.length > 0;
          setHasMoreResults(hasMore);

          // If we've reached the end, update totalHits to reflect actual results
          if (!hasMore) {
            setTotalHits(
              Math.max(
                totalHits,
                results.length +
                  newResults.filter(
                    (r) =>
                      !results.some(
                        (existing) =>
                          existing.extra_data?.uuid === r.extra_data?.uuid
                      )
                  ).length
              )
            );
          }
        }
      }

      // Calculate total processing time (including React rendering)
      const searchEndTime = Date.now();
      const totalDuration = searchEndTime - searchStartTime;
      setLastSearchTime(totalDuration);

      // IMPORTANT: We do NOT update filters based on search results
      // This ensures filters remain stable and consistent during search
    } catch (error) {
      console.error("Search failed:", error);
      setApiOffline(true);
      setLastSearchTime(null);
      setLastApiTime(null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Filter selection and clearing are now handled directly by FilterPanel via SearchContext

  // Helper function to handle feedback submission
  const handleFeedbackSubmit = async (
    rating: number | null,
    comment: string
  ) => {
    if (!rating) return;

    try {
      await submitFeedback(rating, comment);
      // You could add a success toast here if desired
      console.log("Feedback submitted successfully");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      // You could add an error toast here if desired
    }
  };

  // Helper function to capitalize filter labels
  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
  }

  // Process aggregations to create filters - this should only be called with initial aggregation data
  const processAggregations = (
    aggs: Record<string, any>
  ): AggregateFilter[] => {
    const aggregateFilters: AggregateFilter[] = [];

    // Define fields that should use range sliders
    const numericFields = [
      "sample_size",
      "age_lower",
      "age_upper",
      "start_year",
      "end_year",
      "duration_years",
      "num_sweeps",
    ];

    // Create a special combined age_range filter from age_lower and age_upper
    let ageMinValue = Infinity;
    let ageMaxValue = -Infinity;

    // Process each aggregation
    Object.entries(aggs).forEach(([field, data]) => {
      // Special handling for age fields to create combined filter
      if (
        field === "age_lower" ||
        field === "age_upper" ||
        field === "age_min" ||
        field === "age_max"
      ) {
        const stats = data.statistics || {};

        // Extract min/max, handling possible different property names
        let minStat = stats.minimum;
        if (typeof minStat !== "number" || !isFinite(minStat)) {
          minStat = stats.min;
        }

        let maxStat = stats.maximum;
        if (typeof maxStat !== "number" || !isFinite(maxStat)) {
          maxStat = stats.max;
        }

        // Update age range based on both fields
        if (typeof minStat === "number" && isFinite(minStat)) {
          ageMinValue = Math.min(ageMinValue, minStat);
        }

        if (typeof maxStat === "number" && isFinite(maxStat)) {
          ageMaxValue = Math.max(ageMaxValue, maxStat);
        }

        return; // Skip individual age fields
      }

      // Handle numeric fields
      if (numericFields.includes(field)) {
        const stats = data.statistics || {};

        // Extract min value, handling possible different property names
        let minValue: number;
        if (typeof stats.minimum === "number" && isFinite(stats.minimum)) {
          minValue = stats.minimum;
        } else if (typeof stats.min === "number" && isFinite(stats.min)) {
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
          } else if (field === "num_sweeps") {
            minValue = 0;
          } else {
            minValue = 0;
          }
        }

        // Extract max value, handling possible different property names
        let maxValue: number;
        if (typeof stats.maximum === "number" && isFinite(stats.maximum)) {
          maxValue = stats.maximum;
        } else if (typeof stats.max === "number" && isFinite(stats.max)) {
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
        const options = Array.from({ length: 101 }, (_, i) =>
          String(minValue + (i / 100) * (maxValue - minValue))
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
    if (
      isFinite(ageMinValue) &&
      isFinite(ageMaxValue) &&
      ageMinValue <= ageMaxValue
    ) {
      // Ensure max is greater than min
      if (ageMaxValue <= ageMinValue) {
        ageMaxValue = ageMinValue + 1;
      }

      const ageOptions = Array.from({ length: 101 }, (_, i) =>
        String(ageMinValue + (i / 100) * (ageMaxValue - ageMinValue))
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

      const ageOptions = Array.from({ length: 101 }, (_, i) =>
        String(defaultAgeMin + (i / 100) * (defaultAgeMax - defaultAgeMin))
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

  // Handler for Find Similar button
  const handleFindSimilar = useCallback(async (result: SearchResult) => {
    const uuid = result.extra_data?.uuid;
    if (!uuid) return;

    // Get the study name
    const studyName =
      result.dataset_schema?.name || result.extra_data?.name || "Unnamed Study";

    // Set the search query with study name first and UUID in brackets
    updateQuery(`LIKE:${studyName} (${uuid})`);

    const description =
      result.dataset_schema?.description || result.extra_data?.description;

    if (description) {
      // Update query and perform search with description
      updateQuery(description);
      performSearchWithQuery(description);
    } else {
      // If no description available, use the study name for search
      console.warn(
        `No description available for study ${studyName}, using name for similar search`
      );
      updateQuery(studyName);
      performSearchWithQuery(studyName);
    }
  }, []);

  // Helper to perform search with a specific query (bypassing debounce)
  const performSearchWithQuery = async (query: string) => {
    setLoading(true);
    setApiOffline(false);
    try {
      const combinedFilters = { ...searchSettings.selectedFilters };
      if (resourceType) {
        combinedFilters.resource_type = [resourceType];
      }
      Object.keys(combinedFilters).forEach((key) => {
        if (
          Array.isArray(combinedFilters[key]) &&
          combinedFilters[key].length === 0
        ) {
          delete combinedFilters[key];
        }
      });

      // Extract UUID from LIKE query if present
      let searchQuery = query;
      let originalStudyUuid: string | undefined;
      const likeMatch = query.match(/^LIKE:(.*?)\s*\(([^)]+)\)$/);
      if (likeMatch) {
        // Use the UUID from the brackets for the actual search
        originalStudyUuid = likeMatch[2];
        searchQuery = `LIKE:${originalStudyUuid}`;
      }

      // Adjust maxDistance based on page number
      const adjustedMaxDistance = getAdjustedMaxDistance(
        searchSettings.maxDistance,
        currentPage
      );

      const res: SearchResponse = await fetchSearchResults(
        searchQuery,
        combinedFilters,
        currentPage,
        resultsPerPage,
        searchSettings.useSearch2,
        searchSettings.hybridWeight,
        // For LIKE searches, exclude the original study by passing its UUID in top_level_ids_seen_so_far
        // For regular pagination, use the current ref
        originalStudyUuid
          ? [originalStudyUuid] // Exclude original study from LIKE search results
          : currentPage > 1
          ? currentTopLevelIdsRef.current
          : undefined,
        currentPage > 1 ? currentNextPageOffsetRef.current : undefined,
        undefined, // returnVariablesWithinParent
        adjustedMaxDistance, // maxVectorDistance - adjusted based on page number
        searchSettings.directMatchWeight, // directMatchWeight
        searchSettings.maxDistanceMode // maxDistanceMode
      );
      setResults(res.results || []);
      setTotalHits(res.num_hits || 0);
      setIsResultCountLowerBound(res.is_result_count_lower_bound || false);
    } catch (error) {
      setApiOffline(true);
    } finally {
      setLoading(false);
    }
  };

  // Get the study icon based on resource type
  const getTypeIcon = (study: SearchResult | null) => {
    const resourceType =
      study?.extra_data?.resource_type || study?.dataset_schema?.["@type"];

    if (resourceType?.includes("dataset")) {
      return <Database size={48} />;
    } else if (resourceType?.includes("variable")) {
      return <File size={48} />;
    } else if (resourceType?.includes("study")) {
      return <Book size={48} />;
    } else {
      return <FileText size={48} />;
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          py: { xs: 2, sm: 3, md: 4 }, // Responsive padding
        }}
      >
        {/* Search Section or Similar Study Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            mb: { xs: 2, sm: 3, md: 4 },
          }}
        >
          {similarUid ? (
            // Similar Study Header
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                width: "100%",
                p: 3,
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: 1,
              }}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "grey.500",
                }}
              >
                {(similarStudy?.dataset_schema as any)?.image ? (
                  <Image
                    src={(similarStudy?.dataset_schema as any).image}
                    alt={(similarStudy?.dataset_schema as any)?.name || "Study"}
                    width={100}
                    height={100}
                    style={{ objectFit: "contain" }}
                    unoptimized={true}
                  />
                ) : (
                  getTypeIcon(similarStudy)
                )}
              </Box>
              <Box>
                <Typography variant="h4" gutterBottom>
                  {similarStudy?.dataset_schema?.name ||
                    similarStudy?.extra_data?.name ||
                    "Unnamed Study"}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Similar Studies
                </Typography>
              </Box>
            </Box>
          ) : (
            // Regular Search Bar
            <>
              <TextField
                // Input key no longer needed - SearchContext handles state
                fullWidth
                placeholder="What are you searching for?"
                value={searchSettings.query}
                onChange={(e) => {
                  updateQuery(e.target.value);
                }}
                InputProps={{
                  endAdornment: (
                    <Box
                      sx={{
                        mr: 1,
                        ml: -0.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      {searchSettings.query !==
                        searchSettings.debouncedQuery && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontSize: { xs: "0.6rem", sm: "0.7rem" },
                          }}
                        >
                          Typing...
                        </Typography>
                      )}
                      <Image
                        src={getAssetPrefix() + "icons/discover.svg"}
                        alt="Search"
                        width={20}
                        height={20}
                      />
                      {results.length > 0 && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Open dialog - user will need to select which result
                            setSelectedResultForFeedback(null);
                            setSelectedResultIndex(-1);
                            setSearchFeedbackOpen(true);
                          }}
                          sx={{
                            opacity: 0.7,
                            "&:hover": { opacity: 1 },
                            color: "text.secondary",
                            p: 0.5,
                          }}
                          title="Report search result issue"
                        >
                          <Bug size={18} />
                        </IconButton>
                      )}
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
                {/* AdvancedSearchDropdown now uses SearchContext directly */}
                <AdvancedSearchDropdown />
              </Box>
            </>
          )}
        </Box>

        {/* Filter Panel with initial filters - now uses SearchContext directly */}
        <FilterPanel filtersData={filters} />

        {/* Search Results Summary - Always rendered to prevent layout shift */}
        {!apiOffline && (
          <Box
            sx={{
              mb: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {loading
                ? "Searching..."
                : (() => {
                    // Smart display logic for results count
                    if (!hasMoreResults) {
                      // We've reached the end - show total found
                      return `${results.length} results found`;
                    } else if (results.length > totalHits) {
                      // We have more results than original estimate - show estimate was low
                      const countDisplay = isResultCountLowerBound 
                        ? `more than ${totalHits}` 
                        : `${totalHits}+`;
                      return `${results.length} results loaded (${countDisplay} estimated)`;
                    } else if (totalHits > 0) {
                      // Normal case - show loaded vs estimated
                      const countDisplay = isResultCountLowerBound 
                        ? `more than ${totalHits}` 
                        : `~${totalHits}`;
                      return `${results.length} of ${countDisplay} results loaded`;
                    } else {
                      // Fallback - just show loaded count
                      return `${results.length} results loaded`;
                    }
                  })()}
              {!loading && lastApiTime && ` (API: ${lastApiTime}ms`}
              {!loading &&
                lastSearchTime &&
                lastApiTime &&
                `, Total: ${lastSearchTime}ms)`}
            </Typography>

            {/* Save search button - always visible */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<Bookmark size={16} />}
              onClick={saveSearch}
              disabled={!searchSettings.query.trim() || loading}
              sx={{
                ml: 2,
              }}
              title="Save this search"
            >
              Save Search
            </Button>
          </Box>
        )}

        {/* Show full-width hero banner only on initial load with no URL params, otherwise show split layout */}
        {!results.length &&
        !loading &&
        searchSettings.query.trim() === "" &&
        Object.keys(searchSettings.selectedFilters).length === 0 &&
        resourceTypeFilter.length === 0 &&
        !initialQuery &&
        initialTopics.length === 0 &&
        initialInstruments.length === 0 &&
        initialStudyDesign.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <Box sx={{ width: "80%", maxWidth: 1200 }}>
              <HeroBanner
                onExampleClick={(query) => {
                  // Set loading immediately to prevent "No results" flash
                  console.log(
                    "🎯 Hero banner clicked, setting loading to true immediately"
                  );
                  setLoading(true);
                  updateQuery(query);
                }}
              />
            </Box>
          </Box>
        ) : (
          /* Main Content Area - Responsive Layout */
          <Box
            sx={{
              display: isMobile ? "block" : "flex",
              width: "100%",
              flex: 1,
              minHeight: 0, // Important for flex child scrolling
              overflow: "visible", // Prevent main container from scrolling
              position: "relative", // For overlay positioning
            }}
          >
            {/* Search Results Panel - Fixed 50% width */}
            <Box
              sx={{
                width: isTablet ? "100%" : "50%",
                minWidth: isMobile ? "100%" : "300px",
                overflowX: "hidden", // Prevent any content from breaking out
                display: "flex",
                flexDirection: "column",
                height: "100%",
                position: "relative",
              }}
            >
              {loading ? (
                <Typography>Loading search results...</Typography>
              ) : apiOffline ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    py: 8,
                    px: 4,
                    height: "100%",
                  }}
                >
                  <CloudOffIcon
                    sx={{
                      fontSize: { xs: 48, sm: 64 },
                      color: "text.secondary",
                      mb: 2,
                    }}
                  />
                  <Typography variant="h5" color="text.secondary" gutterBottom>
                    The discovery API is currently offline
                  </Typography>
                  <Typography color="text.secondary">
                    Please try again soon. We apologize for the inconvenience.
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{ mt: 4 }}
                    onClick={() => {
                      setApiOffline(false);
                      performSearch();
                    }}
                  >
                    Retry Connection
                  </Button>
                </Box>
              ) : (
                <Box
                  sx={{
                    flex: 1,
                    overflowY: "auto",
                    minHeight: 0, // Important for flex child scrolling
                    display: "flex",
                    flexDirection: "column",
                  }}
                  id="search-results-container"
                >
                  <InfiniteScroll
                    dataLength={results.length}
                    next={loadMore}
                    hasMore={hasMoreResults}
                    loader={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          py: 3,
                        }}
                      >
                        <Loader2
                          size={24}
                          className="animate-spin"
                          style={{ color: "#1976d2" }}
                        />
                      </Box>
                    }
                    scrollableTarget="search-results-container"
                    endMessage={
                      <Typography>No more results to load.</Typography>
                    }
                  >
                    <SearchResults
                      results={results}
                      resourceTypeFilter={resourceTypeFilter}
                      onSelectResult={handleSelectResult}
                      selectedResultId={selectedResult?.extra_data?.uuid}
                      onFindSimilar={handleFindSimilar}
                      onReportResult={(result, index) => {
                        setSelectedResultForFeedback(result);
                        setSelectedResultIndex(index);
                        setSearchFeedbackOpen(true);
                      }}
                      hasActiveSearch={
                        searchSettings.query.trim() !== "" ||
                        Object.keys(searchSettings.selectedFilters).length >
                          0 ||
                        resourceTypeFilter.length > 0
                      }
                      loading={(() => {
                        const loadingState = loading || loadingMore;
                        console.log(
                          "🔍 DiscoverPage passing to SearchResults:",
                          {
                            resultsLength: results.length,
                            loading,
                            loadingMore,
                            loadingState,
                            hasActiveSearch:
                              searchSettings.query.trim() !== "" ||
                              Object.keys(searchSettings.selectedFilters)
                                .length > 0 ||
                              resourceTypeFilter.length > 0,
                            query: searchSettings.query,
                            filtersCount: Object.keys(
                              searchSettings.selectedFilters
                            ).length,
                          }
                        );
                        return loadingState;
                      })()}
                      onClearQuery={() => {
                        updateQuery("");
                      }}
                      onClearFilters={() => {
                        updateSearchSettings({
                          selectedFilters: {},
                        });
                      }}
                    />
                  </InfiniteScroll>
                </Box>
              )}
            </Box>

            {/* Study Detail Panel - Shown on tablet and desktop */}
            {!isMobile && (results.length > 0 || totalHits > 0) && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: isDetailExpanded
                    ? "calc(100% - 130px)"
                    : isTablet
                    ? "0%"
                    : "50%",
                  height: "100%",
                  bgcolor: "background.paper",
                  borderLeft:
                    isTablet && !isDetailExpanded ? "none" : "1px solid",
                  borderColor: "grey.200",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "visible", // Allow overflow for the collapse button
                  transition: "width 0.3s ease-in-out",
                  cursor: selectedResult ? "pointer" : "default",
                  zIndex: isDetailExpanded ? 2 : 1,
                  boxShadow: isDetailExpanded
                    ? "-4px 0 8px rgba(0, 0, 0, 0.1)"
                    : "none",
                }}
                onClick={handleDetailClick}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: -16,
                    left: -16,
                    zIndex: 1000,
                  }}
                >
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering detail click
                      handleCollapse();
                    }}
                    sx={{
                      bgcolor: "primary.main",
                      color: "white",
                      "&:hover": {
                        bgcolor: "primary.dark",
                      },
                      boxShadow: 2,
                      width: 30,
                      height: 30,
                    }}
                  >
                    {!isDetailExpanded ? (
                      <ChevronLeft size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </IconButton>
                </Box>

                {apiOffline ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      p: 4,
                      height: "100%",
                    }}
                  >
                    <CloudOffIcon
                      sx={{
                        fontSize: { xs: 36, sm: 48 },
                        color: "text.secondary",
                        mb: 2,
                      }}
                    />
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
                      API Offline
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Study details unavailable
                    </Typography>
                  </Box>
                ) : // Conditionally render StudyDetail or placeholder
                studyDetail ? (
                  <Box
                    sx={{
                      height: "100%",
                      overflowY: "auto",
                      minHeight: 0, // Important for flex child scrolling
                    }}
                  >
                    <StudyDetail study={studyDetail} isDrawerView={false} />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      height: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      p: 2,
                    }}
                  >
                    <Typography color="text.secondary">
                      Select a dataset to view details
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Mobile Drawer for Study Details */}
        <Drawer
          anchor="right"
          open={isMobile && drawerOpen}
          onClose={handleCloseDrawer}
          sx={{
            "& .MuiDrawer-paper": {
              width: { xs: "100%", sm: "80%", md: "60%" },
              maxWidth: "600px",
              p: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              bgcolor: "background.paper",
              borderBottom: "1px solid",
              borderColor: "grey.200",
              p: 1,
            }}
          >
            <IconButton
              onClick={handleCloseDrawer}
              sx={{ position: "absolute", top: 8, right: 8 }}
            >
              <CloseIcon />
            </IconButton>
            <Box
              sx={{
                py: 1,
                pl: 1,
                pr: 6,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Typography variant="h6" sx={{ flex: 1 }}>
                {selectedResult
                  ? selectedResult.dataset_schema?.name || "Study Details"
                  : "Study Details"}
              </Typography>
              {selectedResult &&
                ((selectedResult.dataset_schema &&
                  (selectedResult.dataset_schema as any).image) ||
                  (selectedResult as any).image) &&
                !drawerImageError && (
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      position: "relative",
                      borderRadius: "4px",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <Image
                      src={
                        (selectedResult.dataset_schema &&
                          (selectedResult.dataset_schema as any).image) ||
                        (selectedResult as any).image
                      }
                      alt={selectedResult.dataset_schema?.name || "Study image"}
                      fill
                      style={{ objectFit: "contain" }}
                      onError={() => setDrawerImageError(true)}
                      unoptimized={true}
                    />
                  </Box>
                )}
            </Box>
          </Box>
          <Box
            sx={{
              p: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            {/* Conditionally render StudyDetail or placeholder in drawer */}
            {studyDetail ? (
              <StudyDetail
                studyDataComplete={false}
                study={studyDetail}
                isDrawerView={true}
              />
            ) : (
              <Box
                sx={{
                  display: "flex",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  p: 2,
                }}
              >
                <Typography color="text.secondary">
                  Select a dataset to view details
                </Typography>
              </Box>
            )}
          </Box>
        </Drawer>
      </Container>

      {/* Feedback Button */}
      <FeedbackButton onSubmitFeedback={handleFeedbackSubmit} />

      {/* Search Feedback Dialog */}
      <SearchFeedbackDialog
        open={searchFeedbackOpen}
        onClose={() => {
          setSearchFeedbackOpen(false);
          setSelectedResultForFeedback(null);
          setSelectedResultIndex(-1);
        }}
        onSubmit={async (feedbackData: SearchFeedbackData) => {
          // Ensure we have a reported result
          const reportedResult =
            selectedResultForFeedback || feedbackData.reportedResult;
          const resultIndex =
            selectedResultIndex >= 0
              ? selectedResultIndex
              : feedbackData.searchContext.resultIndex;

          // Capture results up to and including the reported one
          const displayedResultsUpToReported = results.slice(
            0,
            resultIndex + 1
          );

          const searchFeedbackPayload = {
            reason: feedbackData.reason,
            comment: feedbackData.comment,
            reportedResult: reportedResult,
            searchContext: {
              searchSettings: searchSettings,
              displayedResults: displayedResultsUpToReported,
              resultIndex: resultIndex,
            },
          };

          await submitSearchFeedback(searchFeedbackPayload);
        }}
        reportedResult={selectedResultForFeedback || undefined}
        searchContext={{
          searchSettings: searchSettings,
          displayedResults: results,
          resultIndex:
            selectedResultIndex >= 0
              ? selectedResultIndex
              : selectedResultForFeedback
              ? results.findIndex(
                  (r) =>
                    r.extra_data?.uuid ===
                    selectedResultForFeedback.extra_data?.uuid
                )
              : -1,
        }}
      />
      <ComingSoonDialog
        open={comingSoonOpen}
        onClose={() => setComingSoonOpen(false)}
        featureName={comingSoonFeature}
      />
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
