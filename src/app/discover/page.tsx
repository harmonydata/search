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
import {
  fetchSearchResults,
  fetchAggregateFilters,
  fetchResultByUuid,
  fetchKeywordPhrases,
  SearchResponse,
  SearchResult,
  AggregateFilter,
} from "@/services/api";
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
  const isMobile = useMediaQuery(theme.breakpoints.down("lg")); // 1200px breakpoint
  const { searchSettings, updateSearchSettings } = useSearch();
  const [searchQuery, setSearchQuery] = useState(searchSettings.query);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(
    searchSettings.query
  );
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<AggregateFilter[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >(searchSettings.selectedFilters);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchSettings.selectedCategory
  );
  const [loading, setLoading] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalHits, setTotalHits] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDebug, setShowDebug] = useState(false);
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
      selectedFilters,
      selectedCategory,
      useSearch2,
      hybridWeight,
      maxDistance,
    });
  }, [
    searchQuery,
    selectedFilters,
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
    selectedFilters,
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
      (!selectedFilters.keywords ||
        selectedFilters.keywords.join(",") !== initialTopics.join(","))
    ) {
      setSelectedFilters((prev) => ({
        ...prev,
        keywords: initialTopics,
      }));
      didSet = true;
    }
    if (
      initialInstruments &&
      initialInstruments.length > 0 &&
      (!selectedFilters.instruments ||
        selectedFilters.instruments.join(",") !== initialInstruments.join(","))
    ) {
      setSelectedFilters((prev) => ({
        ...prev,
        instruments: initialInstruments,
      }));
      didSet = true;
    }
    if (
      initialStudyDesign &&
      initialStudyDesign.length > 0 &&
      (!selectedFilters.study_design ||
        selectedFilters.study_design.join(",") !== initialStudyDesign.join(","))
    ) {
      setSelectedFilters((prev) => ({
        ...prev,
        study_design: initialStudyDesign,
      }));
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
  const filtersRef = useRef(JSON.stringify(selectedFilters));
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

  // Debug helper function to log current state to console
  const debugState = useCallback(() => {
    // Store state in window for later inspection
    if (typeof window !== "undefined") {
      // @ts-ignore - Adding debug properties to window
      window.__debugState = {
        // currentPage,
        currentPage,
        totalHits,
        resultsPerPage,
        searchQuery,
        debouncedSearchQuery,
        selectedFilters,
        filters,
        results,
        selectedResult,
        apiOffline,
        topLevelIdsSeen,
      };

      console.log("Current state stored in window.__debugState");
      console.log("Current state:", {
        pagination: {
          currentPage,
          totalHits,
        },
        searchQuery,
        debouncedSearchQuery,
        selectedFilters,
        filterCount: filters.length,
        resultCount: results.length,
        selectedResult: selectedResult
          ? {
              id: selectedResult.extra_data?.uuid,
              title: selectedResult.dataset_schema?.name,
            }
          : null,
        apiOffline,
      });
    }
  }, [
    // currentPage,
    currentPage,
    totalHits,
    resultsPerPage,
    searchQuery,
    debouncedSearchQuery,
    selectedFilters,
    filters,
    results,
    selectedResult,
    apiOffline,
    topLevelIdsSeen,
  ]);

  // Handle result selection (works in both modes)
  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      setSelectedResult(result);
      if (isMobile) {
        setDrawerOpen(true);
      }
      // If detail is expanded, just update the content without collapsing
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

  // Handle detail area click for desktop expansion
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

  // Toggle debug panel
  const toggleDebug = useCallback(() => {
    setShowDebug((prev) => !prev);
    debugState();
  }, [debugState]);

  // Debug event to prevent console clearing
  useEffect(() => {
    if (typeof window !== "undefined") {
      const preserveLog = (e: Event) => {
        if (e.target === window) {
          console.log("Preserving console log");
          e.stopPropagation();
          return false;
        }
        return true;
      };

      window.addEventListener("beforeunload", preserveLog, true);

      return () => {
        window.removeEventListener("beforeunload", preserveLog, true);
      };
    }
  }, []);

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

  // Convert SearchResult to StudyDetail format
  // This needs to be defined *before* studyDetailForDisplay which uses it
  const mapResultToStudyDetail = useCallback((result: SearchResult) => {
    const isVariableResult =
      result.extra_data?.resource_type?.includes("variable");
    const hasAncestors =
      Array.isArray(result.ancestors) && result.ancestors.length > 0;
    const displayResult =
      (isVariableResult && hasAncestors && result.ancestors?.[0]) || result;

    // Skip immediate lookup - only do lookup when result is actually selected
    // This prevents instant API calls for every search result
    // Extract data from result
    const title = displayResult.dataset_schema?.name || "Untitled Dataset";
    const description = displayResult.dataset_schema?.description || "";

    // Extract image - using type assertion to handle possible undefined
    const image =
      (displayResult.dataset_schema as any)?.image ||
      (displayResult as any).image ||
      undefined;

    // Extract publisher with type safety
    let publisher: { name: string; url?: string; logo?: string } | undefined =
      undefined;
    if (displayResult.dataset_schema?.publisher?.[0]?.name) {
      publisher = {
        name: displayResult.dataset_schema.publisher[0].name,
        url: (displayResult.dataset_schema.publisher[0] as any)?.url,
        logo: (displayResult.dataset_schema.publisher[0] as any)?.logo,
      };
    }

    // Extract funders with type safety - handling both array and space-delimited string formats
    let funders:
      | Array<{ name: string; url?: string; logo?: string }>
      | undefined = undefined;

    // Check if this is from the Catalogue of Mental Health
    const isFromCMHM =
      displayResult.dataset_schema?.includedInDataCatalog?.some(
        (catalog) =>
          catalog.name?.includes("Mental Health") ||
          catalog.name?.includes("CMHM")
      );

    // Additional check for catalogues that might have similar funder formats
    const hasMentalHealthTopics = (displayResult as any).topics?.some(
      (topic: string) =>
        topic.toLowerCase().includes("mental health") ||
        topic.toLowerCase().includes("psychiatry") ||
        topic.toLowerCase().includes("psychology")
    );

    // console.log("Is from CMHM:", isFromCMHM, "Has mental health topics:", hasMentalHealthTopics);

    // Helper function to detect if a string appears to be a space-delimited list of abbreviations
    const isAbbreviationList = (str: string): boolean => {
      // If it has spaces and no commas or semicolons, it might be a list
      if (!str.includes(" ") || /[,.;]/.test(str)) return false;

      // Split by spaces and check if parts look like abbreviations
      const parts = str
        .split(" ")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      // Is each part likely to be an abbreviation?
      // Check if most parts are short (<=8 chars) or contain uppercase characters
      const abbreviationCount = parts.filter(
        (part) =>
          part.length <= 8 ||
          part.toUpperCase() === part ||
          /[A-Z]{2,}/.test(part)
      ).length;

      // If most parts (>60%) look like abbreviations, consider it an abbreviation list
      return abbreviationCount / parts.length > 0.6;
    };

    // First check if we have funders as an array in dataset_schema
    if (
      displayResult.dataset_schema?.funder &&
      Array.isArray(displayResult.dataset_schema.funder) &&
      displayResult.dataset_schema.funder.length > 0
    ) {
      // console.log("Processing funders from dataset_schema.funder array:", displayResult.dataset_schema.funder);
      funders = displayResult.dataset_schema.funder.map((funder) => ({
        name: funder.name || "Funding Organization",
        url: (funder as any)?.url,
        logo: (funder as any)?.logo,
      }));
    }
    // Then check for funders as a property in the result or extra_data
    else if (
      (displayResult as any).funders ||
      (displayResult.extra_data as any)?.funders
    ) {
      const resultFunders =
        (displayResult as any).funders ||
        (displayResult.extra_data as any)?.funders;
      // console.log("Processing funders from result.funders or extra_data.funders:", resultFunders);

      if (Array.isArray(resultFunders)) {
        // Handle array of funders
        funders = resultFunders.map((funder) => {
          if (typeof funder === "string") {
            return { name: funder };
          } else if (typeof funder === "object" && funder !== null) {
            return {
              name: funder.name || "Funding Organization",
              url: funder.url,
              logo: funder.logo,
            };
          }
          return { name: String(funder) };
        });
      } else if (typeof resultFunders === "string") {
        // Handle string of funders (potentially space-delimited)
        if (resultFunders.trim()) {
          // For Catalogue of Mental Health or strings that look like abbreviation lists,
          // split by spaces and treat each part as a separate funder
          if (
            (isFromCMHM ||
              hasMentalHealthTopics ||
              isAbbreviationList(resultFunders)) &&
            resultFunders.includes(" ")
          ) {
            // console.log("Processing potential abbreviation list:", resultFunders);
            // Split the space-delimited list into individual abbreviations
            const funderAbbreviations = resultFunders
              .split(" ")
              .map((part) => part.trim())
              .filter((part) => part.length > 0);

            // console.log("Split into abbreviations:", funderAbbreviations);

            // Create a separate funder entry for each abbreviation
            funders = funderAbbreviations.map((abbr) => ({
              name: abbr,
            }));
          }
          // For other sources, check if it's a space-delimited list without punctuation
          else if (
            resultFunders.includes(" ") &&
            !/[,.;]/.test(resultFunders)
          ) {
            const funderNames = resultFunders
              .split(" ")
              .filter((part) => part.trim().length > 0);
            funders = funderNames.map((name) => ({ name }));
          } else {
            // Just use the string as a single funder name
            funders = [{ name: resultFunders }];
          }
        }
      }
    }

    // Try more checks for CMHM-specific funders if we still don't have any
    if (
      !funders ||
      funders.length === 0 ||
      isFromCMHM ||
      hasMentalHealthTopics
    ) {
      // Check various fields that might contain funder information
      const possibleFunderFields = [
        (displayResult as any).cmhm_funders,
        (displayResult.extra_data as any)?.cmhm_funders,
        (displayResult as any).funding_bodies,
        (displayResult.extra_data as any)?.funding_bodies,
        (displayResult as any).funding,
        (displayResult.extra_data as any)?.funding,
        (displayResult as any).funder,
        (displayResult.extra_data as any)?.funder,
      ];

      // Find the first non-empty field
      const additionalFunders = possibleFunderFields.find(
        (field) => field !== undefined && field !== null
      );

      if (additionalFunders) {
        // console.log("Found additional funders in alternative field:", additionalFunders);

        let newFunders: Array<{ name: string; url?: string; logo?: string }> =
          [];

        if (typeof additionalFunders === "string" && additionalFunders.trim()) {
          // If it looks like an abbreviation list, split it
          if (isAbbreviationList(additionalFunders)) {
            const funderAbbreviations = additionalFunders
              .split(" ")
              .map((part) => part.trim())
              .filter((part) => part.length > 0);

            newFunders = funderAbbreviations.map((abbr) => ({ name: abbr }));
          } else {
            // Just use the string as a single funder name
            newFunders = [{ name: additionalFunders }];
          }
        } else if (Array.isArray(additionalFunders)) {
          newFunders = additionalFunders.map((funder) =>
            typeof funder === "string"
              ? { name: funder }
              : {
                  name: funder.name || String(funder),
                  url: funder.url,
                  logo: funder.logo,
                }
          );
        }

        // If we already had funders, merge with new ones, otherwise use new ones
        if (funders && funders.length > 0) {
          // console.log("Merging with existing funders");
          // Merge but avoid duplicates
          const existingNames = new Set(funders.map((f) => f.name));
          const uniqueNewFunders = newFunders.filter(
            (f) => !existingNames.has(f.name)
          );
          funders = [...funders, ...uniqueNewFunders];
        } else {
          funders = newFunders;
        }
      }
    }

    // Handle special case for raw funder string when we couldn't parse it previously
    if (
      (!funders || funders.length === 1) &&
      funders?.[0]?.name &&
      isAbbreviationList(funders[0].name)
    ) {
      // console.log("Re-processing single funder that looks like an abbreviation list:", funders[0].name);

      const funderAbbreviations = funders[0].name
        .split(" ")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

      funders = funderAbbreviations.map((abbr) => ({ name: abbr }));
    }

    // Geographic coverage
    const geographicCoverage =
      (displayResult as any).geographic_coverage ||
      displayResult.extra_data?.country_codes?.join(", ") ||
      (displayResult as any).country_codes?.join(", ") ||
      undefined;

    // Temporal coverage (from dataset_schema or start/end years)
    const temporalCoverage =
      displayResult.dataset_schema?.temporalCoverage ||
      ((displayResult as any).start_year &&
        `${(displayResult as any).start_year}${
          (displayResult as any).end_year
            ? `..${(displayResult as any).end_year}`
            : ""
        }`);

    // Sample size
    const sampleSize =
      (displayResult as any).sample_size?.toString() ||
      (displayResult.dataset_schema as any)?.size?.toString() ||
      undefined;

    // Age coverage
    const ageLower =
      displayResult.extra_data?.age_lower || (displayResult as any).age_lower;
    const ageUpper =
      displayResult.extra_data?.age_upper || (displayResult as any).age_upper;
    const ageCoverage =
      ageLower !== undefined && ageUpper !== undefined
        ? `${ageLower} - ${ageUpper} years`
        : ageLower !== undefined
        ? `${ageLower}+ years`
        : ageUpper !== undefined
        ? `0 - ${ageUpper} years`
        : undefined;

    // Study design
    const studyDesign =
      displayResult.extra_data?.study_design ||
      (displayResult as any).study_design ||
      [];

    // Resource type
    const resourceType =
      displayResult.extra_data?.resource_type ||
      displayResult.dataset_schema?.["@type"] ||
      undefined;

    // Topics and instruments
    const unfilteredTopics =
      displayResult.dataset_schema?.keywords ||
      (displayResult as any).topics ||
      [];

    // Filter out malformed keywords/topics that contain HTML fragments
    const topics = unfilteredTopics.filter(
      (topic: any) =>
        typeof topic === "string" &&
        !topic.includes("<a title=") &&
        !topic.startsWith("<")
    );

    const instruments = (displayResult as any).extra_data?.instruments || [];

    // Extract variables that matched the search query
    const matchedVariables = displayResult.variables_which_matched || [];

    // Extract all variables from dataset schema
    const allVariables = displayResult.dataset_schema?.variableMeasured || [];

    // Data catalogs from includedInDataCatalog
    let dataCatalogs:
      | Array<{ name: string; url?: string; logo?: string }>
      | undefined;

    // Keep track of all URLs that are already linked via dataCatalogs
    const usedUrls = new Set<string>();

    if (
      displayResult.dataset_schema?.includedInDataCatalog &&
      displayResult.dataset_schema.includedInDataCatalog.length > 0
    ) {
      // Get dataset URLs if available
      const datasetUrls = displayResult.dataset_schema.url || [];

      dataCatalogs = displayResult.dataset_schema.includedInDataCatalog.map(
        (catalog) => {
          let catalogUrl = catalog.url;

          // Check if there's a more specific URL in the dataset's URL array that matches this catalog
          if (Array.isArray(datasetUrls) && catalogUrl) {
            try {
              // Extract the catalog domain
              const catalogDomain = new URL(catalogUrl).hostname;

              // Find a URL in datasetUrls that has the same domain
              const matchingUrl = datasetUrls.find((urlStr) => {
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

          // Add to used URLs set
          if (catalogUrl) {
            usedUrls.add(catalogUrl);
          }

          return {
            name: catalog.name || "Data Catalog",
            url: catalogUrl || undefined,
            logo: catalog.image, // Fallback to a default logo
          };
        }
      );
    }

    // Extract additional URLs from identifiers and url fields that aren't already covered by data catalogs
    let additionalLinks: string[] = [];

    // Process identifiers (URLs to papers, DOIs, etc.)
    if (
      displayResult.dataset_schema?.identifier &&
      Array.isArray(displayResult.dataset_schema.identifier)
    ) {
      // Filter valid URLs and DOIs
      const validUrls = displayResult.dataset_schema.identifier
        .filter((id) => {
          // Check if it's a URL
          if (id.startsWith("http://") || id.startsWith("https://")) {
            return true;
          }
          // Check if it's a DOI
          if (id.startsWith("10.") && id.includes("/")) {
            return true;
          }
          return false;
        })
        .map((id) => {
          // Convert DOIs to URLs if needed
          if (id.startsWith("10.") && id.includes("/")) {
            return `https://doi.org/${id}`;
          }
          return id;
        });

      // Filter out URLs that are already in dataCatalogs
      additionalLinks = [
        ...additionalLinks,
        ...validUrls.filter((url) => !usedUrls.has(url)),
      ];
    }

    // Process direct URL field
    if (
      displayResult.dataset_schema?.url &&
      Array.isArray(displayResult.dataset_schema.url)
    ) {
      // Filter out URLs that are already in dataCatalogs
      const newUrls = displayResult.dataset_schema.url.filter(
        (url) => !usedUrls.has(url)
      );
      additionalLinks = [...additionalLinks, ...newUrls];
    }

    // Add any other potential URL fields
    const otherUrlFields = [
      (displayResult as any).url,
      (displayResult as any).original_source_url,
      (displayResult as any).doi?.startsWith("10.")
        ? `https://doi.org/${(displayResult as any).doi}`
        : null,
    ].filter(Boolean) as string[];

    // Add these URLs if they're not already included
    otherUrlFields.forEach((url) => {
      if (url && !usedUrls.has(url) && !additionalLinks.includes(url)) {
        additionalLinks.push(url);
      }
    });

    // Ensure we have unique URLs
    additionalLinks = Array.from(new Set(additionalLinks));

    // console.log("Additional links found:", additionalLinks);

    // AI Summary from extra_data
    const aiSummary = displayResult.extra_data?.ai_summary || null;

    return {
      title,
      description,
      image,
      uuid: displayResult.extra_data?.uuid,
      slug: displayResult.extra_data?.slug,
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
      additionalLinks,
      child_datasets: displayResult.child_datasets || [],
      aiSummary,
    };
  }, []);

  // Save search function
  const saveSearch = async () => {
    if (!currentUser || !searchQuery.trim() || savingSearch) return;

    setSavingSearch(true);
    setSaveSearchSuccess(false);
    try {
      const searchData = {
        query: searchQuery,
        filters: selectedFilters,
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

  // Progressive loading: immediate with search data, then enhanced with lookup data
  const [studyDetail, setStudyDetail] = useState<any | null>(null);
  const [studyDebugData, setStudyDebugData] = useState<any | null>(null);
  const [isLoadingEnhancedData, setIsLoadingEnhancedData] = useState(false);

  // Immediate rendering with search data
  useEffect(() => {
    if (!selectedResult) {
      setStudyDetail(null);
      setStudyDebugData(null);
      setIsLoadingEnhancedData(false);
      return;
    }

    // Immediately render with search result data
    const immediateDetail = mapResultToStudyDetail(selectedResult);
    setStudyDetail(immediateDetail);
    setIsLoadingEnhancedData(true);

    // Store debug data for immediate rendering
    const immediateDebugData =
      true || process.env.NODE_ENV !== "production"
        ? {
            originalSearchResult: selectedResult,
            lookupData: null, // Will be updated when lookup completes
          }
        : undefined;
    setStudyDebugData(immediateDebugData);
  }, [selectedResult, mapResultToStudyDetail]);

  // Background lookup for enhanced data
  useEffect(() => {
    let cancelled = false;
    async function loadEnhancedDetail() {
      if (!selectedResult) {
        return;
      }

      try {
        // Fetch the full detail from the backend
        const calculatedAlpha = calculateDynamicHybridWeight(searchQuery);
        const fullResult = await fetchResultByUuid(
          selectedResult.extra_data?.uuid || "",
          searchQuery,
          calculatedAlpha,
          debouncedMaxDistance
        );

        // Preserve the matched variables and child datasets from the lookup result (which is complete)
        // The search result only has incomplete data (1 member), so we use the lookup result
        // Only override if the lookup result doesn't have these fields
        if (
          !fullResult.variables_which_matched &&
          selectedResult.variables_which_matched
        ) {
          fullResult.variables_which_matched =
            selectedResult.variables_which_matched;
        }
        if (
          !fullResult.child_datasets &&
          selectedResult.datasets_which_matched
        ) {
          fullResult.child_datasets = selectedResult.datasets_which_matched;
        }

        const enhancedDetail = mapResultToStudyDetail(fullResult);

        // Store enhanced debug data
        const enhancedDebugData =
          true || process.env.NODE_ENV !== "production"
            ? {
                originalSearchResult: selectedResult,
                lookupData: fullResult,
              }
            : undefined;

        if (!cancelled) {
          setStudyDetail(enhancedDetail);
          setStudyDebugData(enhancedDebugData);
          setIsLoadingEnhancedData(false);
        }
      } catch (error) {
        console.error("Failed to load enhanced study detail:", error);
        if (!cancelled) {
          setIsLoadingEnhancedData(false);
        }
      }
    }

    // Only perform lookup if we have a selected result
    if (selectedResult) {
      loadEnhancedDetail();
    }

    return () => {
      cancelled = true;
    };
  }, [
    selectedResult,
    searchQuery,
    debouncedMaxDistance,
    calculateDynamicHybridWeight,
  ]);

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
      JSON.stringify(selectedFilters) !== filtersRef.current ||
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
        filtersRef.current = JSON.stringify(selectedFilters);
        useSearch2Ref.current = useSearch2;
        hybridWeightRef.current = debouncedHybridWeight;
        maxDistanceRef.current = debouncedMaxDistance;
        topLevelIdsSeenRef.current = topLevelIdsSeen;
      });
    }
  }, [
    debouncedSearchQuery,
    selectedFilters,
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
      const combinedFilters = { ...selectedFilters };

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
      // More detailed logging for pagination debugging
      console.log("Detailed pagination info:", {
        pageToUse,
        topLevelIdsSeenLength: topLevelIdsSeen.length,
        topLevelIdsSeenSample: topLevelIdsSeen.slice(0, 5),
        currentTopLevelIdsRefLength: currentTopLevelIdsRef.current.length,
        currentTopLevelIdsRefSample: currentTopLevelIdsRef.current.slice(0, 5),
        nextPageOffset: currentNextPageOffsetRef.current,
        idsToExclude: idsToExclude || [],
        willPassIds: pageToUse > 1 && !useSearch2,
        willPassOffset:
          pageToUse > 1 && currentNextPageOffsetRef.current !== undefined,
        willUsePost:
          pageToUse > 1 && !useSearch2 && (idsToExclude?.length || 0) > 0,
        useSearch2,
      });

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
    setSelectedFilters((prev) => ({
      ...prev,
      [category]: selectedOptions,
    }));
  };

  // Handler for topic clicks in study detail
  const handleTopicClick = (topic: string) => {
    const currentKeywords = selectedFilters?.keywords || [];
    if (!currentKeywords.includes(topic)) {
      const newKeywords = [...currentKeywords, topic];
      setSelectedFilters((prev) => ({
        ...prev,
        keywords: newKeywords,
      }));
      handleFilterSelection("keywords", newKeywords);
    }
  };
  // Handler for topic clicks in study detail
  const handleInstrumentClick = (instrument: string) => {
    const currentInstruments = selectedFilters?.instruments || [];
    if (!currentInstruments.includes(instrument)) {
      const newInstruments = [...currentInstruments, instrument];
      setSelectedFilters((prev) => ({
        ...prev,
        instruments: newInstruments,
      }));
      handleFilterSelection("instruments", newInstruments);
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
      "num_variables",
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
          } else if (field === "num_variables" || field === "num_sweeps") {
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

    let description =
      result.dataset_schema?.description || result.extra_data?.description;
    if (!description) {
      // Fetch full result if description is missing
      try {
        const fullResult = await fetchResultByUuid(
          uuid,
          undefined,
          undefined,
          debouncedMaxDistance
        );
        description =
          fullResult.dataset_schema?.description ||
          fullResult.extra_data?.description;
      } catch (e) {
        console.error("Failed to fetch description for LIKE search", e);
        return;
      }
    }
    if (description) {
      // Set debouncedSearchQuery immediately and perform search with description
      setDebouncedSearchQuery(description);
      performSearchWithQuery(description);
    }
  }, []);

  // Helper to perform search with a specific query (bypassing debounce)
  const performSearchWithQuery = async (query: string) => {
    setLoading(true);
    setApiOffline(false);
    try {
      const combinedFilters = { ...selectedFilters };
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
          selectedFilters={selectedFilters}
        />

        {/* Search Results Summary */}
        {!loading && !apiOffline && (results.length > 0 || totalHits > 0) && (
          <Box
            sx={{
              mb: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {(() => {
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
              {lastApiTime && ` (API: ${lastApiTime}ms`}
              {lastSearchTime && lastApiTime && `, Total: ${lastSearchTime}ms)`}
            </Typography>

            {/* Save search button - only visible when user is logged in and has results */}
            {currentUser && results.length > 0 && (
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
                disabled={savingSearch || !searchQuery.trim()}
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
              width: isMobile ? "100%" : "50%",
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
                      (!selectedFilters ||
                        Object.values(selectedFilters).every(
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
                    />
                  </InfiniteScroll>
                </Box>
              </>
            )}
          </Box>

          {/* Study Detail Panel - Only shown on desktop */}
          {!isMobile && (results.length > 0 || totalHits > 0) && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                right: 0,
                width: isDetailExpanded ? "calc(100% - 130px)" : "50%",
                height: "100%",
                bgcolor: "background.paper",
                borderLeft: "1px solid",
                borderColor: "grey.200",
                display: "flex",
                flexDirection: "column",
                overflow: "visible",
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
                  <StudyDetail
                    study={studyDetail}
                    isDrawerView={false}
                    onTopicClick={handleTopicClick}
                    onInstrumentClick={handleInstrumentClick}
                    debugData={studyDebugData}
                    originalSearchResult={studyDebugData?.lookupData}
                    isLoadingEnhancedData={isLoadingEnhancedData}
                  />
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
                study={studyDetail}
                isDrawerView={true}
                onTopicClick={handleTopicClick}
                onInstrumentClick={handleInstrumentClick}
                debugData={studyDebugData}
                originalSearchResult={studyDebugData?.lookupData}
                isLoadingEnhancedData={isLoadingEnhancedData}
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
