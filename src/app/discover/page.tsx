"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import CloseIcon from "@mui/icons-material/Close";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import Image from "next/image";
import SearchResults from "@/components/SearchResults";
import FilterPanel from "@/components/FilterPanel";
import StudyDetail from "@/components/StudyDetail";
import FeedbackButton from "@/components/FeedbackButton";
import {
  fetchSearchResults,
  fetchAggregateFilters,
  fetchResultByUuid,
  fetchKeywordPhrases,
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
  const { searchSettings, updateSearchSettings } = useSearch();
  const [searchQuery, setSearchQuery] = useState(searchSettings.query);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(
    searchSettings.query
  );
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<AggregateFilter[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchSettings.selectedCategory
  );
  const [loading, setLoading] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalHits, setTotalHits] = useState(0);
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

  // New state for advanced search options
  const [useSearch2, setUseSearch2] = useState(searchSettings.useSearch2);
  const [hybridWeight, setHybridWeight] = useState(searchSettings.hybridWeight);
  const [debouncedHybridWeight, setDebouncedHybridWeight] = useState(
    searchSettings.hybridWeight
  );
  const [maxDistance, setMaxDistance] = useState(searchSettings.maxDistance);
  const [debouncedMaxDistance, setDebouncedMaxDistance] = useState(
    searchSettings.maxDistance
  );

  // State for tracking search performance
  const [lastSearchTime, setLastSearchTime] = useState<number | null>(null);
  const [lastApiTime, setLastApiTime] = useState<number | null>(null);

  // State for new pagination logic with deduplication
  const [topLevelIdsSeen, setTopLevelIdsSeen] = useState<string[]>([]);
  const [nextPageOffset, setNextPageOffset] = useState<number | undefined>(
    undefined
  );

  // State for keyword phrases
  const [keywordPhrases, setKeywordPhrases] = useState<string[]>([]);
  const [keywordPhrasesLoaded, setKeywordPhrasesLoaded] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveSearchSuccess, setSaveSearchSuccess] = useState(false);
  const [hasInitializedFromContext, setHasInitializedFromContext] =
    useState(false);

  const resultsPerPage = 50;

  const { currentUser } = useAuth();

  // Sync local state changes back to context
  useEffect(() => {
    updateSearchSettings({
      query: searchQuery,
      selectedFilters: searchSettings.selectedFilters,
      selectedCategory,
      useSearch2,
      hybridWeight,
      maxDistance,
    });
  }, [
    searchQuery,
    searchSettings.selectedFilters,
    selectedCategory,
    useSearch2,
    hybridWeight,
    maxDistance,
    updateSearchSettings,
  ]);

  // Reset save search success state when search query or filters change
  useEffect(() => {
    setSaveSearchSuccess(false);
  }, [
    searchQuery,
    searchSettings.selectedFilters,
    useSearch2,
    hybridWeight,
    maxDistance,
    selectedCategory,
  ]);

  // Detect when search settings are loaded from context and trigger search
  useEffect(() => {
    // Check if we have meaningful search parameters from context
    const hasSearchQuery =
      searchSettings.query && searchSettings.query.trim() !== "";
    const hasFilters = Object.keys(searchSettings.selectedFilters).length > 0;

    // Only trigger if we haven't initialized yet and we have search parameters
    if (!hasInitializedFromContext && (hasSearchQuery || hasFilters)) {
      setHasInitializedFromContext(true);
      // Trigger search with current context settings
      performSearch(searchSettings.query || "", 1);
    }
  }, [searchSettings, hasInitializedFromContext, performSearch]);

  // Reset initialization flag when component mounts to allow fresh loads
  useEffect(() => {
    setHasInitializedFromContext(false);
  }, []);

  const searchParams = useSearchParams();
  const resourceType = searchParams.get("resource_type");
  const similarUid = searchParams.get("like");
  const initialQuery = searchParams.get("query");
  const initialTopics = searchParams.getAll("topics");
  const initialInstruments = searchParams.getAll("instruments");
  const initialStudyDesign = searchParams.getAll("study_design");

  // Initialize context from URL parameters on first load
  useEffect(() => {
    const hasUrlParams =
      initialQuery ||
      initialTopics.length > 0 ||
      initialInstruments.length > 0 ||
      initialStudyDesign.length > 0;

    if (hasUrlParams) {
      const urlFilters: Record<string, string[]> = {};
      if (initialTopics.length > 0) urlFilters.keywords = initialTopics;
      if (initialInstruments.length > 0)
        urlFilters.instruments = initialInstruments;
      if (initialStudyDesign.length > 0)
        urlFilters.study_design = initialStudyDesign;
      if (resourceType) urlFilters.resource_type = [resourceType];

      updateSearchSettings({
        query: initialQuery || "",
        selectedFilters: urlFilters,
        selectedCategory: null,
        resourceType: resourceType,
        similarUid: similarUid,
      });
    }
  }, []); // Only run once on mount

  const router = useRouter();

  useEffect(() => {
    let didSet = false;
    if (initialQuery) {
      setSearchQuery(initialQuery);
      setDebouncedSearchQuery(initialQuery);
      didSet = true;
    }
    if (
      initialTopics &&
      initialTopics.length > 0 &&
      (!searchSettings.selectedFilters.keywords ||
        searchSettings.selectedFilters.keywords.join(",") !==
          initialTopics.join(","))
    ) {
      updateSearchSettings({
        ...searchSettings,
        selectedFilters: {
          ...searchSettings.selectedFilters,
          keywords: initialTopics,
        },
      });
      didSet = true;
    }
    if (
      initialInstruments &&
      initialInstruments.length > 0 &&
      (!searchSettings.selectedFilters.instruments ||
        searchSettings.selectedFilters.instruments.join(",") !==
          initialInstruments.join(","))
    ) {
      updateSearchSettings({
        ...searchSettings,
        selectedFilters: {
          ...searchSettings.selectedFilters,
          instruments: initialInstruments,
        },
      });

      didSet = true;
    }
    if (
      initialStudyDesign &&
      initialStudyDesign.length > 0 &&
      (!searchSettings.selectedFilters.study_design ||
        searchSettings.selectedFilters.study_design.join(",") !==
          initialStudyDesign.join(","))
    ) {
      updateSearchSettings({
        ...searchSettings,
        selectedFilters: {
          ...searchSettings.selectedFilters,
          study_design: initialStudyDesign,
        },
      });

      didSet = true;
    }
    // Remove the params from the URL after processing
    if (didSet && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("query");
      url.searchParams.delete("topics");
      url.searchParams.delete("instruments");
      url.searchParams.delete("study_design");

      //router auto appends the basepath (/search) so we need to take care here!
      const targetPath = url.pathname.replace("/search", "");
      console.log("Navigating to:", targetPath + url.search);
      router.replace(targetPath + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, initialTopics, initialInstruments, initialStudyDesign]);
  const resourceTypeFilter = useMemo(
    () => (resourceType ? [resourceType] : []),
    [resourceType]
  );

  // Refs to track previous query and filters for page reset logic
  const searchQueryRef = useRef(debouncedSearchQuery);
  const filtersRef = useRef(JSON.stringify(searchSettings.selectedFilters));
  const useSearch2Ref = useRef(useSearch2);
  const hybridWeightRef = useRef(debouncedHybridWeight);
  const maxDistanceRef = useRef(debouncedMaxDistance);
  const topLevelIdsSeenRef = useRef(topLevelIdsSeen);
  const isResettingPageRef = useRef(false);

  // Ref to store the latest top_level_ids_seen_so_far immediately for next API call
  const currentTopLevelIdsRef = useRef<string[]>([]);

  // Ref to store the latest next_page_offset immediately for next API call
  const currentNextPageOffsetRef = useRef<number | undefined>(undefined);

  // Calculate dynamic hybrid weight based on query length and keyword phrases
  const calculateDynamicHybridWeight = useCallback(
    (query: string): number => {
      if (!query || query.trim() === "" || query === "*") {
        return 0.5; // Default balanced weight for empty queries
      }

      const trimmedQuery = query.trim();

      // Check if query matches any keyword phrases (case-insensitive)
      const isKeywordPhrase = keywordPhrases.some(
        (phrase) => trimmedQuery.toLowerCase() === phrase.toLowerCase()
      );

      // If it matches a keyword phrase, use alpha = 0 (pure keyword search)
      if (isKeywordPhrase) {
        return 0;
      }

      return 0.5;
    },
    [keywordPhrases]
  );

  // Handlers for advanced search configuration
  const handleEndpointChange = useCallback((newUseSearch2: boolean) => {
    setUseSearch2(newUseSearch2);
  }, []);

  const handleHybridWeightChange = useCallback((newWeight: number) => {
    setHybridWeight(newWeight);
  }, []);

  const handleMaxDistanceChange = useCallback((newDistance: number) => {
    setMaxDistance(newDistance);
  }, []);

  // Update hybrid weight when search query changes (auto-calculation)
  // This needs to happen BEFORE the search is triggered to avoid wasteful searches
  useEffect(() => {
    const dynamicWeight = calculateDynamicHybridWeight(debouncedSearchQuery);
    setHybridWeight(dynamicWeight);
    // Also immediately update the debounced value to avoid delay
    setDebouncedHybridWeight(dynamicWeight);
  }, [debouncedSearchQuery, calculateDynamicHybridWeight]);

  // Debounce search query to prevent firing API calls on every keystroke
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay after user stops typing

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  // Debounce hybrid weight to prevent firing API calls on every slider movement
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedHybridWeight(hybridWeight);
    }, 300); // 300ms delay after user stops dragging

    return () => {
      clearTimeout(timerId);
    };
  }, [hybridWeight]);

  // Debounce max distance to prevent firing API calls on every slider movement
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedMaxDistance(maxDistance);
    }, 300); // 300ms delay after user stops dragging

    return () => {
      clearTimeout(timerId);
    };
  }, [maxDistance]);

  // Fetch keyword phrases on first visit
  useEffect(() => {
    const loadKeywordPhrases = async () => {
      if (!keywordPhrasesLoaded) {
        try {
          const phrases = await fetchKeywordPhrases();
          setKeywordPhrases(phrases);
          setKeywordPhrasesLoaded(true);
        } catch (error) {
          console.error("Failed to fetch keyword phrases:", error);
          setKeywordPhrasesLoaded(true); // Set to true even on error to prevent retries
        }
      }
    };

    loadKeywordPhrases();
  }, [keywordPhrasesLoaded]);

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

  // Save search function
  const saveSearch = async () => {
    if (!currentUser || !searchQuery.trim() || savingSearch) return;

    setSavingSearch(true);
    setSaveSearchSuccess(false);
    try {
      const searchData = {
        query: searchQuery,
        filters: searchSettings.selectedFilters,
        useSearch2,
        hybridWeight,
        maxDistance,
        selectedCategory,
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
      if (!similarUid) return;

      try {
        setLoading(true);
        const studyResult = await fetchResultByUuid(
          similarUid,
          undefined,
          undefined,
          debouncedMaxDistance
        );
        setSimilarStudy(studyResult);

        // Get description for similar search
        const description =
          studyResult.dataset_schema?.description ||
          studyResult.extra_data?.description;
        if (!description) {
          throw new Error("No description available for similar search");
        }

        // Set the search query to the description
        setSearchQuery(description);
        setDebouncedSearchQuery(description);

        // Fetch similar studies
        const calculatedAlpha = calculateDynamicHybridWeight(description);
        const searchResponse = await fetchSearchResults(
          description,
          {},
          1, // First page
          resultsPerPage,
          useSearch2,
          calculatedAlpha, // Use calculated alpha instead of debouncedHybridWeight
          undefined, // First page, no IDs seen yet
          undefined, // nextPageOffset
          undefined, // returnVariablesWithinParent
          debouncedMaxDistance // maxVectorDistance
        );

        setResults(searchResponse.results || []);
        setTotalHits(searchResponse.num_hits || 0);
      } catch (err) {
        console.error("Failed to load similar studies:", err);
        setApiOffline(true);
      } finally {
        setLoading(false);
      }
    }

    loadSimilarStudy();
  }, [similarUid, resultsPerPage, useSearch2, debouncedHybridWeight]);

  // Effect to trigger search when query, filters, or advanced search options change
  useEffect(() => {
    // Check if query, filters, or advanced search options changed (NOT page changes)
    const isSearchParameterChange =
      debouncedSearchQuery !== searchQueryRef.current ||
      JSON.stringify(searchSettings.selectedFilters) !== filtersRef.current ||
      useSearch2 !== useSearch2Ref.current ||
      debouncedHybridWeight !== hybridWeightRef.current ||
      debouncedMaxDistance !== maxDistanceRef.current;

    // If we're in similar studies mode, use the original description as the query
    const queryToUse = similarUid
      ? similarStudy?.dataset_schema?.description ||
        similarStudy?.extra_data?.description ||
        debouncedSearchQuery
      : debouncedSearchQuery;

    // Only clear results and reset for search parameter changes, NOT page changes
    if (isSearchParameterChange) {
      console.log(
        "🔍 Search parameters changed, clearing results and resetting to page 1"
      );

      // Clear results immediately when search parameters change
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
      performSearch(queryToUse, 1).finally(() => {
        // Update refs only after search completes to prevent race conditions
        searchQueryRef.current = debouncedSearchQuery;
        filtersRef.current = JSON.stringify(searchSettings.selectedFilters);
        useSearch2Ref.current = useSearch2;
        hybridWeightRef.current = debouncedHybridWeight;
        maxDistanceRef.current = debouncedMaxDistance;
        topLevelIdsSeenRef.current = topLevelIdsSeen;
      });
    }
  }, [
    debouncedSearchQuery,
    searchSettings.selectedFilters,
    similarUid,
    similarStudy,
    useSearch2,
    debouncedHybridWeight,
    debouncedMaxDistance,
    // Remove currentPage from dependencies - page changes will be handled separately
  ]);

  // Separate effect to handle page changes for infinite scroll
  useEffect(() => {
    // Only handle page changes when we're not on page 1 (infinite scroll)
    if (currentPage > 1) {
      console.log("📄 Page changed to:", currentPage, "- loading more results");

      const queryToUse = similarUid
        ? similarStudy?.dataset_schema?.description ||
          similarStudy?.extra_data?.description ||
          debouncedSearchQuery
        : debouncedSearchQuery;

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

  async function performSearch(
    query: string = debouncedSearchQuery,
    forcePage?: number
  ) {
    const pageToUse = forcePage !== undefined ? forcePage : currentPage;

    // Set appropriate loading state
    if (pageToUse === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setApiOffline(false);
    const searchStartTime = Date.now();

    // Reset infinite scroll state for new searches (page 1)
    if (pageToUse === 1) {
      setHasMoreResults(true);
      setLoadingMore(false);
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
      console.log("Use Search2:", useSearch2);
      console.log("Similar UID (will be excluded):", similarUid || "None");
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
        // For pagination, use the existing top level IDs
        idsToExclude = currentTopLevelIdsRef.current;
      } else if (similarUid) {
        // For similar study searches, exclude the original study
        idsToExclude = [similarUid];
        console.log(
          "Excluding original study from similar search:",
          similarUid
        );
      }

      // Calculate the alpha to use based on query and keyword phrases
      const calculatedAlpha = calculateDynamicHybridWeight(query);

      // Race the actual API call against the timeout
      const res: SearchResponse = await Promise.race([
        fetchSearchResults(
          query,
          combinedFilters,
          pageToUse, // Use pageToUse instead of currentPage
          resultsPerPage,
          useSearch2,
          calculatedAlpha, // Use calculated alpha instead of debouncedHybridWeight
          idsToExclude, // Use the determined IDs to exclude
          pageToUse > 1 ? currentNextPageOffsetRef.current : undefined, // Pass next page offset for subsequent pages
          undefined, // returnVariablesWithinParent
          debouncedMaxDistance // maxVectorDistance
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

      // Update nextPageOffset with the new offset from the response (new pagination logic)
      if (res.next_page_offset !== undefined) {
        console.log("Received next_page_offset:", {
          offset: res.next_page_offset,
          previousOffset: currentNextPageOffsetRef.current,
        });
        // Update both state and ref immediately
        setNextPageOffset(res.next_page_offset);
        currentNextPageOffsetRef.current = res.next_page_offset;
      } else {
        console.log(
          "No next_page_offset in response (using calculated offset)"
        );
      }

      if (pageToUse === 1) {
        // First page - replace all results
        setResults(newResults);
        setTotalHits(res.num_hits || 0);
        // For new search endpoint (not useSearch2), determine hasMore based on whether we got results
        // For old search endpoint (useSearch2), use the traditional count-based logic
        if (!useSearch2) {
          // New pagination logic: we have more if we got any results (we'll check next page to see if there are more)
          const hasMore = newResults.length > 0;
          setHasMoreResults(hasMore);

          // If first page already shows we have all results, update totalHits
          if (!hasMore || newResults.length < resultsPerPage) {
            setTotalHits(Math.max(res.num_hits || 0, newResults.length));
          }

          // Auto-load more pages if we don't have enough results on first page
          if (newResults.length > 0) {
            // Define minimum thresholds for first page
            const minResultsThreshold = Math.min(20, resultsPerPage / 2); // At least 20 results or half the page size

            // If we got fewer than expected results and haven't reached minimum threshold, auto-load next page
            if (
              newResults.length < resultsPerPage &&
              newResults.length < minResultsThreshold
            ) {
              console.log(
                "🔄 Auto-loading next page from first page - insufficient results:",
                {
                  gotResults: newResults.length,
                  requestedResults: resultsPerPage,
                  minThreshold: minResultsThreshold,
                  nextPage: 2,
                }
              );

              // Auto-trigger next page after a short delay to avoid rapid-fire requests
              setTimeout(() => {
                if (!loadingMore && hasMoreResults) {
                  setCurrentPage(2);
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
          if (!useSearch2 && newResults.length > 0) {
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

        // For pagination: if we got no results, we're at the end
        if (!useSearch2) {
          // New pagination logic: we're done if this page returned no results
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
        } else {
          // Old pagination logic: based on count comparison
          setHasMoreResults(newResults.length === resultsPerPage);
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

  // Helper function to handle filter selection from FilterPanel
  const handleFilterSelection = (
    category: string,
    selectedOptions: string[]
  ) => {
    // Just update the selected filters - the special case of age_range is handled in FilterPanel
    updateSearchSettings({
      selectedFilters: {
        ...searchSettings.selectedFilters,
        [category]: selectedOptions,
      },
    });
  };

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
    setSearchQuery(`LIKE:${studyName} (${uuid})`);

    const description =
      result.dataset_schema?.description || result.extra_data?.description;

    if (description) {
      // Set debouncedSearchQuery immediately and perform search with description
      setDebouncedSearchQuery(description);
      performSearchWithQuery(description);
    } else {
      // If no description available, use the study name for search
      console.warn(
        `No description available for study ${studyName}, using name for similar search`
      );
      setDebouncedSearchQuery(studyName);
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

      // Calculate the alpha to use based on query and keyword phrases
      const calculatedAlpha = calculateDynamicHybridWeight(searchQuery);

      const res: SearchResponse = await fetchSearchResults(
        searchQuery,
        combinedFilters,
        currentPage,
        resultsPerPage,
        useSearch2,
        calculatedAlpha, // Use calculated alpha instead of debouncedHybridWeight
        // For LIKE searches, exclude the original study by passing its UUID in top_level_ids_seen_so_far
        // For regular pagination, use the current ref
        originalStudyUuid
          ? [originalStudyUuid] // Exclude original study from LIKE search results
          : currentPage > 1
          ? currentTopLevelIdsRef.current
          : undefined,
        currentPage > 1 ? currentNextPageOffsetRef.current : undefined,
        undefined, // returnVariablesWithinParent
        debouncedMaxDistance // maxVectorDistance
      );
      setResults(res.results || []);
      setTotalHits(res.num_hits || 0);
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
                fullWidth
                placeholder="What are you searching for?"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
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
                      {searchQuery !== debouncedSearchQuery && (
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
                <AdvancedSearchDropdown
                  useSearch2={useSearch2}
                  onEndpointChange={handleEndpointChange}
                  hybridWeight={hybridWeight}
                  onHybridWeightChange={handleHybridWeightChange}
                  maxDistance={maxDistance}
                  onMaxDistanceChange={handleMaxDistanceChange}
                />
              </Box>
            </>
          )}
        </Box>

        {/* Filter Panel with initial filters */}
        <FilterPanel
          filtersData={filters}
          onSelectionChange={handleFilterSelection}
          selectedFilters={searchSettings.selectedFilters}
        />

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
                      return `${results.length} results loaded (${totalHits}+ estimated)`;
                    } else if (totalHits > 0) {
                      // Normal case - show loaded vs estimated
                      return `${results.length} of ~${totalHits} results loaded`;
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

            {/* Save search button - always visible when user is logged in to prevent layout shift */}
            {currentUser && (
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  saveSearchSuccess ? (
                    <Bookmark size={16} fill="currentColor" />
                  ) : (
                    <Bookmark size={16} />
                  )
                }
                onClick={saveSearch}
                disabled={savingSearch || !searchQuery.trim() || loading}
                sx={{
                  ml: 2,
                  color: saveSearchSuccess ? "success.main" : "inherit",
                  borderColor: saveSearchSuccess ? "success.main" : "inherit",
                }}
                title="Save this search"
              >
                {savingSearch
                  ? "Saving..."
                  : saveSearchSuccess
                  ? "Saved!"
                  : "Save Search"}
              </Button>
            )}
          </Box>
        )}

        {/* Main Content Area - Responsive Layout */}
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
              <>
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
                      // Check if we have an empty state (no search query and no filters)
                      !debouncedSearchQuery &&
                      (!searchSettings.selectedFilters ||
                        Object.values(searchSettings.selectedFilters).every(
                          (arr) => arr.length === 0
                        )) ? (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            py: 6,
                            textAlign: "center",
                          }}
                        >
                          <Typography
                            variant="h6"
                            color="text.secondary"
                            gutterBottom
                          >
                            Enter a search term or select some filters to begin
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Use the search bar above or apply filters to
                            discover studies
                          </Typography>
                        </Box>
                      ) : (
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
                      )
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
                      hasActiveSearch={
                        searchSettings.query.trim() !== "" ||
                        Object.keys(searchSettings.selectedFilters).length >
                          0 ||
                        resourceTypeFilter.length > 0
                      }
                    />
                  </InfiniteScroll>
                </Box>
              </>
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
                  <Typography variant="h6" color="text.secondary" gutterBottom>
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
