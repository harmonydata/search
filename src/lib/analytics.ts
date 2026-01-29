/**
 * Analytics utilities for tracking search behavior
 * Uses Firebase Analytics for rich structured data tracking
 * Also writes to Firestore for admin dashboard querying
 */

import { getAnalytics, logEvent, Analytics } from "firebase/analytics";
import { collection, addDoc, serverTimestamp } from "firebase/firestore/lite";
import { app, db } from "@/firebase";

let analytics: Analytics | null = null;

/**
 * Initialize Firebase Analytics (client-side only)
 */
export const initAnalytics = (): Analytics | null => {
  if (typeof window === "undefined") return null;
  
  if (!analytics) {
    try {
      analytics = getAnalytics(app);
    } catch (error) {
      console.warn("Firebase Analytics initialization failed:", error);
      return null;
    }
  }
  
  return analytics;
};

/**
 * Track a search event with rich metadata
 */
export interface SearchEventParams {
  query: string;
  numResults: number;
  responseTimeMs: number;
  topResults?: Array<{
    uuid: string;
    title: string;
    resourceType: string;
  }>;
  searchOptions?: {
    useSearch2?: boolean;
    hybridWeight?: number;
    maxDistance?: number;
    maxDistanceMode?: string;
    directMatchWeight?: number;
    paginationStrategy?: string;
  };
  filters?: Record<string, unknown>;
  page?: number;
  resultsPerPage?: number;
}

export const trackSearch = async (params: SearchEventParams): Promise<void> => {
  if (typeof window === "undefined") return;
  
  const analyticsInstance = initAnalytics();
  if (!analyticsInstance) return;

  try {
    // Prepare event parameters
    const eventParams: Record<string, unknown> = {
      search_term: params.query,
      num_results: params.numResults,
      response_time_ms: params.responseTimeMs,
      page: params.page || 1,
      results_per_page: params.resultsPerPage || 100,
    };

    // Add top results (limit to 5)
    if (params.topResults && params.topResults.length > 0) {
      eventParams.top_result_uuids = params.topResults
        .slice(0, 5)
        .map((r) => r.uuid)
        .join(",");
      eventParams.top_result_titles = params.topResults
        .slice(0, 5)
        .map((r) => r.title)
        .join(" | ");
      eventParams.top_result_types = params.topResults
        .slice(0, 5)
        .map((r) => r.resourceType)
        .join(",");
    }

    // Add search options
    if (params.searchOptions) {
      if (params.searchOptions.useSearch2 !== undefined) {
        eventParams.use_search2 = params.searchOptions.useSearch2;
      }
      if (params.searchOptions.hybridWeight !== undefined) {
        eventParams.hybrid_weight = params.searchOptions.hybridWeight;
      }
      if (params.searchOptions.maxDistance !== undefined) {
        eventParams.max_distance = params.searchOptions.maxDistance;
      }
      if (params.searchOptions.maxDistanceMode) {
        eventParams.max_distance_mode = params.searchOptions.maxDistanceMode;
      }
      if (params.searchOptions.directMatchWeight !== undefined) {
        eventParams.direct_match_weight = params.searchOptions.directMatchWeight;
      }
      if (params.searchOptions.paginationStrategy) {
        eventParams.pagination_strategy = params.searchOptions.paginationStrategy;
      }
    }

    // Add filters - store as map/object for better Firestore support
    if (params.filters && Object.keys(params.filters).length > 0) {
      eventParams.filter_count = Object.keys(params.filters).length;
      // For Firebase Analytics, serialize to string (it doesn't support nested objects well)
      eventParams.filters = JSON.stringify(params.filters);
    }

    logEvent(analyticsInstance, "search", eventParams);

    // Also send to Google Analytics 4 via gtag
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "search", {
        search_term: params.query,
        num_results: params.numResults,
        response_time_ms: params.responseTimeMs,
      });
    }

    // Also write to Firestore for admin dashboard querying
    try {
      // Prepare Firestore document - store filters as map/object, not string
      const firestoreEventParams: Record<string, unknown> = {
        ...eventParams,
      };
      
      // Replace stringified filters with actual object for Firestore
      if (params.filters && Object.keys(params.filters).length > 0) {
        firestoreEventParams.filters = params.filters; // Store as map/object
      }
      
      await addDoc(collection(db, "analytics_events"), {
        event_type: "search",
        ...firestoreEventParams,
        timestamp: serverTimestamp(),
        source: "discoverynext",
      });
    } catch (firestoreError) {
      console.warn("Failed to write analytics event to Firestore:", firestoreError);
      // Don't throw - analytics still logged to Firebase Analytics
    }
  } catch (error) {
    console.warn("Failed to track search event:", error);
  }
};

/**
 * Track when a user clicks on a search result
 */
export interface ResultClickParams {
  resultUuid: string;
  resultTitle: string;
  resultType: string;
  position: number; // Position in results list (1-indexed)
  query: string;
}

export const trackResultClick = async (
  params: ResultClickParams
): Promise<void> => {
  if (typeof window === "undefined") return;
  
  const analyticsInstance = initAnalytics();
  if (!analyticsInstance) return;

  try {
    logEvent(analyticsInstance, "select_content", {
      content_type: "search_result",
      content_id: params.resultUuid,
      item_name: params.resultTitle,
      item_category: params.resultType,
      item_list_position: params.position,
      search_term: params.query,
    });

    // Also write to Firestore
    try {
      await addDoc(collection(db, "analytics_events"), {
        event_type: "select_content",
        content_type: "search_result",
        content_id: params.resultUuid,
        item_name: params.resultTitle,
        item_category: params.resultType,
        item_list_position: params.position,
        search_term: params.query,
        timestamp: serverTimestamp(),
        source: "discoverynext",
      });
    } catch (firestoreError) {
      console.warn("Failed to write click event to Firestore:", firestoreError);
    }
  } catch (error) {
    console.warn("Failed to track result click:", error);
  }
};

/**
 * Track filter usage
 */
export interface FilterEventParams {
  filterType: string;
  filterValue: string | string[];
  query?: string;
}

export const trackFilter = async (
  params: FilterEventParams
): Promise<void> => {
  if (typeof window === "undefined") return;
  
  const analyticsInstance = initAnalytics();
  if (!analyticsInstance) return;

  try {
    /* logEvent(analyticsInstance, "filter", {
      filter_type: params.filterType,
      filter_value: Array.isArray(params.filterValue)
        ? params.filterValue.join(",")
        : params.filterValue,
      search_term: params.query || "",
    }); */

    // Also write to Firestore
    try {
       addDoc(collection(db, "analytics_events"), {
        event_type: "filter",
        filter_type: params.filterType,
        filter_value: Array.isArray(params.filterValue)
          ? params.filterValue.join(",")
          : params.filterValue,
        search_term: params.query || "",
        timestamp: serverTimestamp(),
        source: "discoverynext",
      });
    } catch (firestoreError) {
      console.warn("Failed to write filter event to Firestore:", firestoreError);
    }
  } catch (error) {
    console.warn("Failed to track filter event:", error);
  }
};
