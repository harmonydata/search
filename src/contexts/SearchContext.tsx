"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { startTransition } from "react";

export interface SearchSettings {
  query: string; // Immediate query for UI binding
  debouncedQuery: string; // Debounced query for searches/URL
  selectedFilters: Record<string, string[]>;
  useSearch2: boolean;
  hybridWeight: number;
  maxDistance: number;
  maxDistanceMode: "max_distance" | "min_score" | "both"; // How to send maxDistance to API
  directMatchWeight: number;
  paginationStrategy: "filter" | "offset" | "trust_estimate"; // Pagination strategy: filter (top_level_ids_seen), offset-based, or trust_estimate (use top_level_uuids and batch lookup)
  selectedCategory: string | null;
  resourceType: string | null;
  similarUid: string | null;
}

interface SearchContextType {
  searchSettings: SearchSettings;
  updateQuery: (query: string) => void; // For immediate input updates
  updateSearchSettings: (
    settings: Partial<Omit<SearchSettings, "query" | "debouncedQuery">>
  ) => void;
  resetSearchSettings: () => void;
  loadSearchFromSaved: (savedSearch: {
    query: string;
    filters?: Record<string, string[]>;
    useSearch2?: boolean;
    hybridWeight?: number;
    maxDistance?: number;
    maxDistanceMode?: "max_distance" | "min_score" | "both";
    directMatchWeight?: number;
    paginationStrategy?: "filter" | "offset" | "trust_estimate";
    selectedCategory?: string | null;
  }) => void;
}

const defaultSearchSettings: SearchSettings = {
  query: "",
  debouncedQuery: "",
  selectedFilters: {},
  useSearch2: false,
  hybridWeight: 0.5,
  maxDistance: 0.5,
  maxDistanceMode: "both", // Default to both
  directMatchWeight: 0.5,
  paginationStrategy: "trust_estimate", // Default to trust estimate strategy
  selectedCategory: null,
  resourceType: null,
  similarUid: null,
};

// Default context value for SSR - no-op functions that don't throw errors
const defaultSearchContext: SearchContextType = {
  searchSettings: defaultSearchSettings,
  updateQuery: () => {
    console.warn("Search not available on server");
  },
  updateSearchSettings: () => {
    console.warn("Search not available on server");
  },
  resetSearchSettings: () => {
    console.warn("Search not available on server");
  },
  loadSearchFromSaved: () => {
    console.warn("Search not available on server");
  },
};

const SearchContext = createContext<SearchContextType>(defaultSearchContext);

// LocalStorage key for advanced search settings
const ADVANCED_SETTINGS_STORAGE_KEY = "discovery_advanced_search_settings";

// Helper functions for localStorage persistence
function loadAdvancedSettingsFromStorage(): Partial<SearchSettings> | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem(ADVANCED_SETTINGS_STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    // Validate and return only advanced settings
    return {
      useSearch2: typeof parsed.useSearch2 === "boolean" ? parsed.useSearch2 : undefined,
      hybridWeight: typeof parsed.hybridWeight === "number" ? parsed.hybridWeight : undefined,
      maxDistance: typeof parsed.maxDistance === "number" ? parsed.maxDistance : undefined,
      maxDistanceMode: (parsed.maxDistanceMode === "max_distance" || parsed.maxDistanceMode === "min_score" || parsed.maxDistanceMode === "both")
        ? parsed.maxDistanceMode
        : undefined,
      directMatchWeight: typeof parsed.directMatchWeight === "number" ? parsed.directMatchWeight : undefined,
      paginationStrategy: (parsed.paginationStrategy === "filter" || parsed.paginationStrategy === "offset" || parsed.paginationStrategy === "trust_estimate")
        ? parsed.paginationStrategy
        : undefined,
    };
  } catch (error) {
    console.error("Failed to load advanced settings from localStorage:", error);
    return null;
  }
}

function saveAdvancedSettingsToStorage(settings: SearchSettings): void {
  if (typeof window === "undefined") return;
  
  try {
    const advancedSettings = {
      useSearch2: settings.useSearch2,
      hybridWeight: settings.hybridWeight,
      maxDistance: settings.maxDistance,
      maxDistanceMode: settings.maxDistanceMode,
      directMatchWeight: settings.directMatchWeight,
      paginationStrategy: settings.paginationStrategy,
    };
    localStorage.setItem(ADVANCED_SETTINGS_STORAGE_KEY, JSON.stringify(advancedSettings));
  } catch (error) {
    console.error("Failed to save advanced settings to localStorage:", error);
  }
}

// Helper functions for URL serialization
function searchSettingsToUrl(
  settings: SearchSettings,
  pathname: string
): string {
  const params = new URLSearchParams();

  // Set query if present
  if (settings.debouncedQuery && settings.debouncedQuery.trim() !== "") {
    params.set("query", settings.debouncedQuery.trim());
  }

  // Set filters
  // Handle standard filters with special URL parameter names
  if (
    settings.selectedFilters.keywords &&
    settings.selectedFilters.keywords.length > 0
  ) {
    settings.selectedFilters.keywords.forEach((topic) =>
      params.append("topics", topic)
    );
  }
  if (
    settings.selectedFilters.instruments &&
    settings.selectedFilters.instruments.length > 0
  ) {
    settings.selectedFilters.instruments.forEach((instrument) =>
      params.append("instruments", instrument)
    );
  }
  if (
    settings.selectedFilters.study_design &&
    settings.selectedFilters.study_design.length > 0
  ) {
    settings.selectedFilters.study_design.forEach((design) =>
      params.append("study_design", design)
    );
  }
  if (
    settings.selectedFilters.resource_type &&
    settings.selectedFilters.resource_type.length > 0
  ) {
    params.set("resource_type", settings.selectedFilters.resource_type[0]);
  }

  // Handle all other filters (including sample characteristics and numeric filters)
  // Skip UI-only keys that contain "#" (like "sample_characteristics#age_range")
  Object.entries(settings.selectedFilters).forEach(([key, values]) => {
    // Skip if already handled above or if it's a UI-only key
    if (
      key === "keywords" ||
      key === "instruments" ||
      key === "study_design" ||
      key === "resource_type" ||
      key.includes("#")
    ) {
      return;
    }

    // Skip empty arrays
    if (!values || values.length === 0) {
      return;
    }

    // Handle numeric min/max pairs (they should be stored as single values)
    // For min/max pairs, we append each value to the same parameter name
    values.forEach((value) => {
      params.append(key, value);
    });
  });

  // Set advanced search parameters
  if (settings.useSearch2) {
    params.set("use_search2", "true");
  }
  if (settings.hybridWeight !== 0.5) {
    params.set("hybrid_weight", settings.hybridWeight.toString());
  }
  if (settings.maxDistance !== 0.5) {
    params.set("max_distance", settings.maxDistance.toString());
  }
  if (settings.maxDistanceMode !== "both") {
    params.set("max_distance_mode", settings.maxDistanceMode);
  }
  if (settings.directMatchWeight !== 0.5) {
    // Transform 0-1 slider value to 0-100 API value
    // Piecewise linear: 0->0, 0.5->50, 1->100
    const apiValue =
      settings.directMatchWeight <= 0.5
        ? 4 * settings.directMatchWeight
        : 16 * settings.directMatchWeight - 6;
    params.set("direct_match_weight", apiValue.toString());
  }
  if (settings.paginationStrategy !== "trust_estimate") {
    params.set("pagination_strategy", settings.paginationStrategy);
  }
  if (settings.selectedCategory) {
    params.set("category", settings.selectedCategory);
  }

  // Set similar study if present
  if (settings.similarUid) {
    params.set("like", settings.similarUid);
  }

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function urlToSearchSettings(
  searchParams: URLSearchParams
): Partial<SearchSettings> {
  const query = searchParams.get("query") || "";
  const topics = searchParams.getAll("topics");
  const instruments = searchParams.getAll("instruments");
  const studyDesign = searchParams.getAll("study_design");
  const resourceType = searchParams.get("resource_type");
  const like = searchParams.get("like");
  const useSearch2 = searchParams.get("use_search2");
  const hybridWeight = searchParams.get("hybrid_weight");
  const maxDistance = searchParams.get("max_distance");
  const maxDistanceMode = searchParams.get("max_distance_mode");
  const directMatchWeight = searchParams.get("direct_match_weight");
  const paginationStrategy = searchParams.get("pagination_strategy");
  const category = searchParams.get("category");

  const urlFilters: Record<string, string[]> = {};

  // Handle standard filters with special URL parameter names
  if (topics.length > 0) urlFilters.keywords = topics;
  if (instruments.length > 0) urlFilters.instruments = instruments;
  if (studyDesign.length > 0) urlFilters.study_design = studyDesign;
  if (resourceType) urlFilters.resource_type = [resourceType];

  // Handle all other URL parameters as filters (including sample characteristics and numeric filters)
  // Known non-filter parameters to skip
  const nonFilterParams = new Set([
    "query",
    "topics",
    "instruments",
    "study_design",
    "resource_type",
    "like",
    "use_search2",
    "hybrid_weight",
    "max_distance",
    "max_distance_mode",
    "direct_match_weight",
    "pagination_strategy",
    "category",
  ]);

  searchParams.forEach((value, key) => {
    if (!nonFilterParams.has(key)) {
      // This is a filter parameter - get all values for this key
      const values = searchParams.getAll(key);
      if (values.length > 0) {
        urlFilters[key] = values;
      }
    }
  });

  return {
    query,
    debouncedQuery: query,
    selectedFilters: urlFilters,
    selectedCategory: category || null,
    useSearch2: useSearch2 === "true",
    hybridWeight: hybridWeight ? parseFloat(hybridWeight) : 0.5,
    maxDistance: maxDistance ? parseFloat(maxDistance) : 0.5,
    maxDistanceMode: (maxDistanceMode === "max_distance" || maxDistanceMode === "min_score" || maxDistanceMode === "both") 
      ? maxDistanceMode 
      : "both",
    directMatchWeight: directMatchWeight
      ? (() => {
          // Transform API value (0-10) back to slider value (0-1)
          // Inverse of piecewise linear function
          const apiVal = parseFloat(directMatchWeight);
          return apiVal <= 2 ? apiVal / 4 : (apiVal + 6) / 16;
        })()
      : 0.5,
    paginationStrategy: (paginationStrategy === "filter" || paginationStrategy === "offset" || paginationStrategy === "trust_estimate")
      ? paginationStrategy
      : "trust_estimate",
    resourceType: resourceType || null,
    similarUid: like || null,
  };
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Initialize with defaults, but will be overridden by localStorage or URL params
  const [searchSettings, setSearchSettings] = useState<SearchSettings>(() => {
    // On client-side, try to load from localStorage first
    if (typeof window !== "undefined") {
      const storedAdvanced = loadAdvancedSettingsFromStorage();
      if (storedAdvanced) {
        return {
          ...defaultSearchSettings,
          ...storedAdvanced,
        };
      }
    }
    return defaultSearchSettings;
  });
  const [isRestoringFromNavigation, setIsRestoringFromNavigation] =
    useState(false);
  const isInitialMount = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUrlRef = useRef<string>("");

  // Initialize from URL on mount using Next.js searchParams
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlSettings = urlToSearchSettings(searchParams);
    
    // Check which URL params are actually present (not just defaults)
    const hasQuery = searchParams.get("query");
    const hasFilters = searchParams.get("topics") || searchParams.get("instruments") || 
                       searchParams.get("study_design") || searchParams.get("resource_type") ||
                       Array.from(searchParams.keys()).some(key => 
                         !["query", "topics", "instruments", "study_design", "resource_type", 
                           "like", "use_search2", "hybrid_weight", "max_distance", 
                           "max_distance_mode", "direct_match_weight", "pagination_strategy", "category"].includes(key)
                       );
    const hasAdvancedInUrl = searchParams.get("use_search2") || 
                             searchParams.get("hybrid_weight") || 
                             searchParams.get("max_distance") || 
                             searchParams.get("max_distance_mode") || 
                             searchParams.get("direct_match_weight") || 
                             searchParams.get("pagination_strategy");
    const hasCategory = searchParams.get("category");
    
    const hasUrlParams = !!(hasQuery || hasFilters || hasAdvancedInUrl || hasCategory);

    if (hasUrlParams) {
      // URL params take precedence - merge with localStorage for advanced settings not in URL
      const storedAdvanced = loadAdvancedSettingsFromStorage();
      const mergedSettings: Partial<SearchSettings> = {
        ...urlSettings,
        // Only use stored advanced settings if they're not in URL
        useSearch2: hasAdvancedInUrl && searchParams.get("use_search2") 
          ? urlSettings.useSearch2 
          : (storedAdvanced?.useSearch2 ?? urlSettings.useSearch2 ?? defaultSearchSettings.useSearch2),
        hybridWeight: hasAdvancedInUrl && searchParams.get("hybrid_weight")
          ? urlSettings.hybridWeight
          : (storedAdvanced?.hybridWeight ?? urlSettings.hybridWeight ?? defaultSearchSettings.hybridWeight),
        maxDistance: hasAdvancedInUrl && searchParams.get("max_distance")
          ? urlSettings.maxDistance
          : (storedAdvanced?.maxDistance ?? urlSettings.maxDistance ?? defaultSearchSettings.maxDistance),
        maxDistanceMode: hasAdvancedInUrl && searchParams.get("max_distance_mode")
          ? urlSettings.maxDistanceMode
          : (storedAdvanced?.maxDistanceMode ?? urlSettings.maxDistanceMode ?? defaultSearchSettings.maxDistanceMode),
        directMatchWeight: hasAdvancedInUrl && searchParams.get("direct_match_weight")
          ? urlSettings.directMatchWeight
          : (storedAdvanced?.directMatchWeight ?? urlSettings.directMatchWeight ?? defaultSearchSettings.directMatchWeight),
        paginationStrategy: hasAdvancedInUrl && searchParams.get("pagination_strategy")
          ? urlSettings.paginationStrategy
          : (storedAdvanced?.paginationStrategy ?? urlSettings.paginationStrategy ?? defaultSearchSettings.paginationStrategy),
      };
      
      setSearchSettings((prev) => {
        const newSettings = { ...prev, ...mergedSettings } as SearchSettings;
        lastUrlRef.current = searchSettingsToUrl(newSettings, pathname);
        return newSettings;
      });
    } else {
      // No URL params - use localStorage for advanced settings if available
      const storedAdvanced = loadAdvancedSettingsFromStorage();
      if (storedAdvanced) {
        setSearchSettings((prev) => ({
          ...prev,
          ...storedAdvanced,
        }));
      }
      lastUrlRef.current = pathname;
    }
    isInitialMount.current = false;
  }, []);

  // Debounce query updates
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearchSettings((prev) => ({
        ...prev,
        debouncedQuery: prev.query,
      }));
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchSettings.query]);

  // Update URL when debounced query or filters change (but not during navigation restoration)
  // Exclude studies and items pages from URL updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isRestoringFromNavigation) return;
    if (isInitialMount.current) return; // Don't update URL on initial mount
    // Exclude studies and items pages
    if (pathname.startsWith("/studies/") || pathname.startsWith("/items/")) return;

    const newUrl = searchSettingsToUrl(searchSettings, pathname);

    // Only update if URL actually changed
    if (newUrl !== lastUrlRef.current) {
      console.log("Updating SEARCH URL to:", newUrl);
      lastUrlRef.current = newUrl;
      startTransition(() => {
        router.push(newUrl);
      });
    }
  }, [
    searchSettings.debouncedQuery,
    searchSettings.selectedFilters,
    searchSettings.useSearch2,
    searchSettings.hybridWeight,
    searchSettings.maxDistance,
    searchSettings.maxDistanceMode,
    searchSettings.directMatchWeight,
    searchSettings.paginationStrategy,
    searchSettings.selectedCategory,
    searchSettings.resourceType,
    searchSettings.similarUid,
    pathname,
    router,
  ]);

  // Handle URL changes from Next.js router (back/forward navigation or external navigation)
  // Exclude studies and items pages from URL param syncing
  useEffect(() => {
    if (isRestoringFromNavigation) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Exclude studies and items pages
    if (pathname.startsWith("/studies/") || pathname.startsWith("/items/")) return;

    const urlSettings = urlToSearchSettings(searchParams);
    const urlQuery = urlSettings.debouncedQuery || "";
    const urlFilters = urlSettings.selectedFilters || {};

    // Check if URL differs from current state (indicates navigation)
    const urlChanged =
      urlQuery !== searchSettings.debouncedQuery ||
      JSON.stringify(urlFilters) !==
        JSON.stringify(searchSettings.selectedFilters) ||
      urlSettings.useSearch2 !== searchSettings.useSearch2 ||
      urlSettings.hybridWeight !== searchSettings.hybridWeight ||
      urlSettings.maxDistance !== searchSettings.maxDistance ||
      urlSettings.maxDistanceMode !== searchSettings.maxDistanceMode ||
      urlSettings.directMatchWeight !== searchSettings.directMatchWeight ||
      urlSettings.paginationStrategy !== searchSettings.paginationStrategy ||
      urlSettings.selectedCategory !== searchSettings.selectedCategory ||
      urlSettings.resourceType !== searchSettings.resourceType ||
      urlSettings.similarUid !== searchSettings.similarUid;

    if (urlChanged) {
      setIsRestoringFromNavigation(true);
      const newUrl = searchSettingsToUrl(
        { ...searchSettings, ...urlSettings },
        pathname
      );
      lastUrlRef.current = newUrl;
      setSearchSettings((prev) => ({
        ...prev,
        ...urlSettings,
      }));
      setTimeout(() => setIsRestoringFromNavigation(false), 100);
    }
  }, [searchParams, pathname]);

  const updateQuery = useCallback((query: string) => {
    setSearchSettings((prev) => ({
      ...prev,
      query,
    }));
  }, []);

  const updateSearchSettings = useCallback(
    (
      newSettings: Partial<Omit<SearchSettings, "query" | "debouncedQuery">>
    ) => {
      setSearchSettings((prev) => {
        const updated = {
          ...prev,
          ...newSettings,
        };
        // Save advanced settings to localStorage whenever they change
        saveAdvancedSettingsToStorage(updated);
        return updated;
      });
    },
    []
  );

  const resetSearchSettings = useCallback(() => {
    setSearchSettings(defaultSearchSettings);
  }, []);

  const loadSearchFromSaved = useCallback(
    (savedSearch: {
      query: string;
      filters?: Record<string, string[]>;
      useSearch2?: boolean;
      hybridWeight?: number;
      maxDistance?: number;
      maxDistanceMode?: "max_distance" | "min_score" | "both";
      directMatchWeight?: number;
      paginationStrategy?: "filter" | "offset" | "trust_estimate";
      selectedCategory?: string | null;
    }) => {
      setSearchSettings({
        ...defaultSearchSettings,
        query: savedSearch.query,
        debouncedQuery: savedSearch.query,
        selectedFilters: savedSearch.filters || {},
        useSearch2: savedSearch.useSearch2 ?? defaultSearchSettings.useSearch2,
        hybridWeight:
          savedSearch.hybridWeight ?? defaultSearchSettings.hybridWeight,
        maxDistance:
          savedSearch.maxDistance ?? defaultSearchSettings.maxDistance,
      maxDistanceMode:
        savedSearch.maxDistanceMode ?? defaultSearchSettings.maxDistanceMode,
      directMatchWeight:
        savedSearch.directMatchWeight ??
          defaultSearchSettings.directMatchWeight,
      paginationStrategy:
        savedSearch.paginationStrategy ?? defaultSearchSettings.paginationStrategy,
      selectedCategory:
        savedSearch.selectedCategory ??
          defaultSearchSettings.selectedCategory,
      });
    },
    []
  );

  return (
    <SearchContext.Provider
      value={{
        searchSettings,
        updateQuery,
        updateSearchSettings,
        resetSearchSettings,
        loadSearchFromSaved,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  return context;
}
