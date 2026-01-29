/**
 * Admin utilities for checking permissions and querying admin data
 * Admin users are stored in Firestore 'users' collection
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  Timestamp,
} from "firebase/firestore/lite";
import { db } from "@/firebase";

/**
 * Helper function to parse filters from either string (old format) or object (new format)
 */
function parseFilters(filters: unknown): Record<string, unknown> | null {
  if (!filters) return null;
  
  if (typeof filters === "string") {
    // Old format: JSON string - try to parse
    try {
      return JSON.parse(filters) as Record<string, unknown>;
    } catch (error) {
      console.warn("Failed to parse filters string:", error);
      return null;
    }
  } else if (typeof filters === "object" && filters !== null) {
    // New format: already an object/map
    return filters as Record<string, unknown>;
  }
  
  return null;
}

/**
 * Check if the current user is an admin by checking Firestore users collection
 * Admin users have a document in the 'users' collection with their UID as the document ID
 * containing isAdmin: true. Firestore security rules prevent non-admins from reading this collection.
 * If the read succeeds, the user is an admin. If it fails (permission denied), they're not.
 */
export const isAdmin = async (
  userId: string | null | undefined
): Promise<boolean> => {
  if (!userId) {
    console.log("🔐 Admin check: No userId provided");
    return false;
  }

  console.log("🔐 Admin check: Checking userId:", userId);

  try {
    const userDocRef = doc(db, "users", userId);
    console.log(`🔐 Admin check: Attempting to read document at users/${userId}`);
    
    const userDoc = await getDoc(userDocRef);
    
    console.log("🔐 Admin check: Document exists:", userDoc.exists());
    
    // If document doesn't exist, user is not admin
    if (!userDoc.exists()) {
      console.log("🔐 Admin check: Document does not exist - user is not admin");
      return false;
    }

    // If we can read the document, check if isAdmin is true
    const userData = userDoc.data();
    console.log("🔐 Admin check: Document data:", userData);
    console.log("🔐 Admin check: isAdmin value:", userData.isAdmin);
    
    const isAdminUser = userData.isAdmin === true;
    console.log("🔐 Admin check: Result:", isAdminUser);
    
    return isAdminUser;
  } catch (error: any) {
    console.error("🔐 Admin check: Error occurred:", error);
    console.error("🔐 Admin check: Error code:", error?.code);
    console.error("🔐 Admin check: Error message:", error?.message);
    
    // If permission denied or any other error, user is not admin
    // Firestore security rules will prevent non-admins from reading
    if (error?.code === "permission-denied") {
      console.log("🔐 Admin check: Permission denied - user is not admin");
      return false;
    }
    console.error("🔐 Admin check: Unexpected error - returning false");
    return false;
  }
};

/**
 * Get analytics events from Firestore
 */
export interface AnalyticsEvent {
  id: string;
  event_type: string;
  timestamp: Timestamp | null;
  [key: string]: unknown;
}

export interface AnalyticsQueryOptions {
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
  limitCount?: number;
}

export const getAnalyticsEvents = async (
  options: AnalyticsQueryOptions = {}
): Promise<AnalyticsEvent[]> => {
  try {
    let q = query(collection(db, "analytics_events"), orderBy("timestamp", "desc"));

    // Filter by event type
    if (options.eventType) {
      q = query(q, where("event_type", "==", options.eventType));
    }

    // Filter by date range
    if (options.startDate) {
      q = query(q, where("timestamp", ">=", Timestamp.fromDate(options.startDate)));
    }
    if (options.endDate) {
      q = query(q, where("timestamp", "<=", Timestamp.fromDate(options.endDate)));
    }

    // Limit results
    if (options.limitCount) {
      q = query(q, limit(options.limitCount));
    } else {
      q = query(q, limit(1000)); // Default limit
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AnalyticsEvent[];
  } catch (error) {
    console.error("Failed to fetch analytics events:", error);
    throw error;
  }
};

/**
 * Get search analytics summary
 */
export interface SearchAnalyticsSummary {
  totalSearches: number;
  averageResponseTime: number;
  averageResults: number;
  topQueries: Array< { query: string; count: number; avgResults: number; avgResponseTime: number }>;
  searchesByDay: Array<{ date: string; count: number }>;
  paginationStrategyCounts: Array<{ strategy: string; count: number }>;
  distanceStrategyCounts: Array<{ strategy: string; count: number }>;
  filterUsage: {
    none: number;
    source: number;
    topics: number;
    study_design: number;
    sample_characteristics: number;
    instruments: number;
  };
}

export const getSearchAnalyticsSummary = async (
  days: number = 30
): Promise<SearchAnalyticsSummary> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const events = await getAnalyticsEvents({
      eventType: "search",
      startDate,
    });

    const searches = events.filter((e) => e.event_type === "search");
    const totalSearches = searches.length;

    // Calculate averages
    const responseTimes = searches
      .map((e) => e.response_time_ms as number)
      .filter((t) => typeof t === "number");
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const resultCounts = searches
      .map((e) => e.num_results as number)
      .filter((n) => typeof n === "number");
    const averageResults =
      resultCounts.length > 0
        ? resultCounts.reduce((a, b) => a + b, 0) / resultCounts.length
        : 0;

    // Top queries with average results and response time
    const queryCounts: Record<string, number> = {};
    const queryResults: Record<string, number[]> = {};
    const queryResponseTimes: Record<string, number[]> = {};
    searches.forEach((e) => {
      const query = (e.search_term as string) || "";
      if (query) {
        queryCounts[query] = (queryCounts[query] || 0) + 1;
        const numResults = e.num_results as number;
        if (typeof numResults === "number") {
          if (!queryResults[query]) {
            queryResults[query] = [];
          }
          queryResults[query].push(numResults);
        }
        const responseTime = e.response_time_ms as number;
        if (typeof responseTime === "number") {
          if (!queryResponseTimes[query]) {
            queryResponseTimes[query] = [];
          }
          queryResponseTimes[query].push(responseTime);
        }
      }
    });
    const topQueries = Object.entries(queryCounts)
      .map(([query, count]) => {
        const results = queryResults[query] || [];
        const avgResults = results.length > 0
          ? Math.round(results.reduce((a, b) => a + b, 0) / results.length)
          : 0;
        const responseTimes = queryResponseTimes[query] || [];
        const avgResponseTime = responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0;
        return { query, count, avgResults, avgResponseTime };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Searches by day
    const dayCounts: Record<string, number> = {};
    searches.forEach((e) => {
      if (e.timestamp) {
        const date = e.timestamp.toDate().toISOString().split("T")[0];
        dayCounts[date] = (dayCounts[date] || 0) + 1;
      }
    });
    const searchesByDay = Object.entries(dayCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Pagination strategy counts
    const paginationStrategyCounts: Record<string, number> = {};
    searches.forEach((e) => {
      const strategy = (e.pagination_strategy as string) || "unknown";
      paginationStrategyCounts[strategy] = (paginationStrategyCounts[strategy] || 0) + 1;
    });
    const paginationStrategyArray = Object.entries(paginationStrategyCounts)
      .map(([strategy, count]) => ({ strategy, count }))
      .sort((a, b) => b.count - a.count);

    // Distance strategy counts
    const distanceStrategyCounts: Record<string, number> = {};
    searches.forEach((e) => {
      const strategy = (e.max_distance_mode as string) || "unknown";
      distanceStrategyCounts[strategy] = (distanceStrategyCounts[strategy] || 0) + 1;
    });
    const distanceStrategyArray = Object.entries(distanceStrategyCounts)
      .map(([strategy, count]) => ({ strategy, count }))
      .sort((a, b) => b.count - a.count);

    // Filter usage analysis - count each category separately
    const filterUsage = {
      none: 0,
      source: 0,
      topics: 0,
      study_design: 0,
      sample_characteristics: 0,
      instruments: 0,
    };

    searches.forEach((e) => {
      const filterCount = (e.filter_count as number) || 0;
      
      if (filterCount === 0) {
        filterUsage.none++;
      } else {
        // Parse filters (handles both old string format and new object format)
        const filters = parseFilters(e.filters);
        
        if (!filters) {
          // Failed to parse or no filters
          filterUsage.none++;
          return;
        }
        
        // Count each category (a search can have multiple categories)
        if (filters.source !== undefined) filterUsage.source++;
        if (filters.keywords !== undefined) filterUsage.topics++; // keywords maps to topics
        if (filters.study_design !== undefined) filterUsage.study_design++;
        if (filters.sample_characteristics !== undefined) filterUsage.sample_characteristics++;
        if (filters.instruments !== undefined) filterUsage.instruments++;
      }
    });

    return {
      totalSearches,
      averageResponseTime: Math.round(averageResponseTime),
      averageResults: Math.round(averageResults),
      topQueries,
      searchesByDay,
      paginationStrategyCounts: paginationStrategyArray,
      distanceStrategyCounts: distanceStrategyArray,
      filterUsage,
    };
  } catch (error) {
    console.error("Failed to get search analytics summary:", error);
    throw error;
  }
};

/**
 * Get feedback from Firestore
 */
export interface FeedbackItem {
  id: string;
  rating?: number;
  comment?: string;
  reason?: string;
  reportedResult?: unknown;
  searchContext?: unknown;
  discovery_search_feedback?: boolean;
  timestamp: Timestamp | null;
  source?: string;
}

export interface HarmonyRatingSummary {
  averageRating: number;
  totalRatings: number;
  ratingsByDay: Array<{ date: string; avgRating: number; count: number }>;
}

/**
 * Get Discovery feedback (source: "discoverynext")
 */
export const getDiscoveryFeedback = async (limitCount: number = 100): Promise<FeedbackItem[]> => {
  try {
    const q = query(
      collection(db, "ratings"),
      where("source", "==", "discoverynext"),
      orderBy("created", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().created || null,
    })) as FeedbackItem[];
  } catch (error) {
    console.error("Failed to fetch discovery feedback:", error);
    throw error;
  }
};

/**
 * Get Harmony feedback (no source or source != "discoverynext") and calculate average rating over time
 */
export const getHarmonyRatingSummary = async (
  days: number = 30
): Promise<HarmonyRatingSummary> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all ratings without source or with source != "discoverynext"
    const allRatingsQuery = query(
      collection(db, "ratings"),
      orderBy("created", "desc")
    );

    const querySnapshot = await getDocs(allRatingsQuery);
    const allRatings = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().created || null,
    })) as FeedbackItem[];

    // Filter for harmony ratings (no source or source != "discoverynext")
    const harmonyRatings = allRatings.filter(
      (item) =>
        item.timestamp &&
        item.timestamp.toDate() >= startDate &&
        (!item.source || item.source !== "discoverynext") &&
        typeof item.rating === "number"
    );

    // Calculate average rating
    const ratings = harmonyRatings.map((r) => r.rating as number);
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;

    // Group by day
    const dayRatings: Record<string, number[]> = {};
    harmonyRatings.forEach((item) => {
      if (item.timestamp) {
        const date = item.timestamp.toDate().toISOString().split("T")[0];
        if (!dayRatings[date]) {
          dayRatings[date] = [];
        }
        if (typeof item.rating === "number") {
          dayRatings[date].push(item.rating);
        }
      }
    });

    const ratingsByDay = Object.entries(dayRatings)
      .map(([date, ratings]) => ({
        date,
        avgRating: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
        count: ratings.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: harmonyRatings.length,
      ratingsByDay,
    };
  } catch (error) {
    console.error("Failed to fetch harmony rating summary:", error);
    throw error;
  }
};

/**
 * Get full harmony ratings (not just summary)
 */
export const getHarmonyRatings = async (limitCount: number = 100): Promise<FeedbackItem[]> => {
  try {
    const q = query(
      collection(db, "ratings"),
      orderBy("created", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const allRatings = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().created || null,
    })) as FeedbackItem[];

    // Filter for harmony ratings (no source or source != "discoverynext")
    const harmonyRatings = allRatings.filter(
      (item) =>
        (!item.source || item.source !== "discoverynext") &&
        typeof item.rating === "number"
    );

    return harmonyRatings;
  } catch (error) {
    console.error("Failed to fetch harmony ratings:", error);
    throw error;
  }
};

/**
 * Get mismatches (harmony quality feedback)
 */
export interface MismatchItem {
  id: string;
  created: Timestamp | null;
  match_reported: number;
  model_used?: {
    framework?: string;
    model?: string;
  };
  q1?: {
    instrument_id?: string;
    instrument_index?: number;
    instrument_name?: string;
    question_text?: string;
    question_no?: string;
    matches?: number[];
    topics_strengths?: Record<string, number>;
  };
  q2?: {
    instrument_id?: string;
    instrument_index?: number;
    instrument_name?: string;
    question_text?: string;
    question_no?: string;
    matches?: number[];
    topics_strengths?: Record<string, number>;
  };
  uid?: string;
}

export const getMismatches = async (limitCount: number = 100): Promise<MismatchItem[]> => {
  try {
    const q = query(
      collection(db, "mismatches"),
      orderBy("created", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created: doc.data().created || null,
    })) as MismatchItem[];
  } catch (error) {
    console.error("Failed to fetch mismatches:", error);
    throw error;
  }
};
