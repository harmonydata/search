const API_BASE = "https://harmonydataweaviate.azureedge.net";

export interface AggregateFilter {
  id: string;
  label: string;
  options: string[];
  type?: "multiselect" | "range";
}

export interface SearchResult {
  // New fields from the Weaviate API
  dataset_schema?: {
    "@context"?: string;
    "@type"?: string;
    name?: string;
    description?: string;
    url?: string[];
    keywords?: string[];
    identifier?: string[];
    variableMeasured?: {
      name: string;
      description?: string;
    }[];
    includedInDataCatalog?: {
      "@type"?: string;
      name?: string;
      url?: string;
      image?: string;
    }[];
    funder?: {
      "@type"?: string;
      name?: string;
    }[];
    publisher?: {
      "@type"?: string;
      name?: string;
    }[];
    creator?: {
      "@type"?: string;
      name?: string;
    }[];
    temporalCoverage?: string;
  };
  extra_data: {
    description?: string;
    name?: string;
    resource_type?: string;
    country_codes?: string[];
    study_design?: string[];
    age_upper?: number;
    age_lower?: number;
    uuid?: string;
    number_of_variables?: number;
  };
  distance?: number;
  cosine_similarity?: number;
  hasFreeAccess?: boolean;
  hasCohortsAvailable?: boolean;
  score?: number;
  match_type?: string[];
  ancestors?: SearchResult[];
  variables_which_matched?: {
    name: string;
    description?: string;
    uuid?: string;
    score: number;
  }[];
  datasets_which_matched?: SearchResult[];
}

export interface SearchResponse {
  results: SearchResult[];
  aggregations: Record<string, any>;
  num_hits?: number;
  top_level_ids_seen_so_far?: string[];
}

// Improved function to format labels nicely
function formatLabel(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export async function fetchAggregateFilters(): Promise<AggregateFilter[]> {
  const response = await fetch(`${API_BASE}/discover/aggregate`, {
    method: "GET",
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "fetchAggregateFilters error. Status:",
      response.status,
      "Response:",
      errorText
    );
    throw new Error("Failed to fetch aggregate filters");
  }
  const data = await response.json();

  // Store response in window object for debugging
  if (typeof window !== "undefined") {
    // @ts-ignore - Adding debug property to window
    window.__lastAggregateResponse = data;
    console.log(
      "Aggregate API response cached in window.__lastAggregateResponse for debugging"
    );

    // Log a summary of the aggregations
    console.log("Aggregate response:", {
      aggregationKeys: Object.keys(data.aggregations || {}),
      sampleKeys: Object.keys(data.aggregations || {})
        .slice(0, 3)
        .map((key) => ({
          key,
          value: data.aggregations[key],
        })),
    });
  }

  // data should have an 'aggregations' property
  const aggregations = data.aggregations || {};
  const filters: AggregateFilter[] = Object.keys(aggregations).map((key) => {
    return {
      id: key,
      label: formatLabel(key),
      options: Object.keys(aggregations[key]),
    };
  });
  return filters;
}

export async function fetchSearchResults(
  query: string,
  filters?: Record<string, string[]>,
  page: number = 1,
  resultsPerPage: number = 40,
  useSearch2: boolean = true,
  hybridWeight?: number,
  topLevelIdsSeen?: string[]
): Promise<SearchResponse> {
  const params = new URLSearchParams();

  // Check if we have any filters
  const hasFilters = filters && Object.keys(filters).length > 0;

  // If no query and no filters, return empty results
  if (!query && !hasFilters) {
    return {
      results: [],
      aggregations: {},
      num_hits: 0,
    } as SearchResponse;
  }

  // Set query parameter - use "*" as a wildcard if query is empty but we have filters
  const safeQuery = !query || query.trim() === "" ? "*" : query.trim();

  /*   // force keyword search if query is a single word or a wildcard
  if (!(safeQuery !== "*" && safeQuery.split(" ").length > 1)) {
    params.set("query_type", "hybrid");
  } else {
    params.set("query_type", "keyword");
  } */

  // Add hybrid weight parameter if provided
  if (hybridWeight !== undefined) {
    params.set("alpha", hybridWeight.toString());
  }

  // Always append the query parameter, even if it's "*"
  params.append("query", safeQuery);

  // Add limit parameter (no offset for now)
  const offset = (page - 1) * resultsPerPage;
  params.set("num_results", resultsPerPage.toString());
  params.set("offset", offset.toString());

  // Add top_level_ids_seen_so_far parameter for pagination (only for search endpoint)
  if (topLevelIdsSeen && topLevelIdsSeen.length > 0 && !useSearch2) {
    topLevelIdsSeen.forEach((id) => {
      params.append("top_level_ids_seen_so_far", id);
    });
  }

  // Group numeric range params for better logging
  const numericRangeParams: Record<string, { min?: string; max?: string }> = {};

  // Append each filter value as a separate query parameter if values exist
  if (filters) {
    for (const key in filters) {
      // Handle the case of min/max parameters for numeric fields
      if (key.endsWith("_min") || key.endsWith("_max")) {
        // Extract the base field name
        const fieldName = key.replace(/_(min|max)$/, "");

        // Initialize entry if it doesn't exist
        if (!numericRangeParams[fieldName]) {
          numericRangeParams[fieldName] = {};
        }

        // Set min or max value
        if (key.endsWith("_min")) {
          numericRangeParams[fieldName].min = filters[key][0];
        } else {
          numericRangeParams[fieldName].max = filters[key][0];
        }

        // Always add the parameter to the URL
        params.append(key, filters[key][0]);
      } else {
        // Regular non-numeric filter - add all values
        filters[key].forEach((value) => {
          params.append(key, value);
        });
      }
    }
  }

  // Use the selected endpoint
  const endpoint = useSearch2 ? "search2" : "search";
  const url = `${API_BASE}/discover/${endpoint}?${params.toString()}`;
  console.log("Search URL:", url);

  // Log numeric range parameters for debugging
  if (Object.keys(numericRangeParams).length > 0) {
    console.log("Numeric range parameters:", numericRangeParams);
  }

  const response = await fetch(url);
  if (!response.ok) {
    console.error("Search API error:", response.status, await response.text());
    throw new Error("Search API request failed");
  }

  const data = await response.json();

  // Store response in window object for debugging
  if (typeof window !== "undefined") {
    // @ts-ignore - Adding debug property to window
    window.__lastSearchResponse = data;
    console.log(
      "Search API response cached in window.__lastSearchResponse for debugging"
    );

    // Log details of the response for debugging
    console.log("Search results:", {
      totalHits: data.num_hits,
      resultCount: data.results?.length || 0,
      firstResult: data.results?.[0],
      aggregations: Object.keys(data.aggregations || {}),
      endpoint: endpoint,
      hybridWeight: hybridWeight,
    });
  }

  // Transform the response if needed to match the expected structure
  // The new API returns a structure with results and aggregations directly
  return {
    results: data.results || [],
    aggregations: data.aggregations || {},
    num_hits: data.num_hits,
    top_level_ids_seen_so_far: data.top_level_ids_seen_so_far || [],
  } as SearchResponse;
}

export async function fetchResultByUuid(uuid: string): Promise<SearchResult> {
  const url = `${API_BASE}/discover/lookup?uuid=${uuid}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.error("Failed to fetch result by UUID:", response.statusText);
    throw new Error(`Failed to fetch result by UUID: ${response.statusText}`);
  }

  const data = await response.json();

  // Store the response in window for debugging
  if (typeof window !== "undefined") {
    // @ts-ignore - Adding debug property to window
    window.__lastLookupResponse = data;
  }

  return data.results[0];
}

export async function fetchOgData(url: string): Promise<any> {
  const response = await fetch(
    `https://harmonydata.azureedge.net/api/ogData?url=${encodeURIComponent(
      url
    )}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch OpenGraph data");
  }
  return response.json();
}

export interface VersionInfo {
  harmony_discovery_version?: string;
  [key: string]: any;
}

export async function fetchVersionInfo(): Promise<VersionInfo> {
  const response = await fetch(`${API_BASE}/info/version`);
  if (!response.ok) {
    console.error("Failed to fetch version info:", response.statusText);
    throw new Error("Failed to fetch version info");
  }
  const data = await response.json();

  // Store response in window object for debugging
  if (typeof window !== "undefined") {
    // @ts-ignore - Adding debug property to window
    window.__lastVersionResponse = data;
    console.log(
      "Version API response cached in window.__lastVersionResponse for debugging"
    );
  }

  return data;
}

// Types for explore page data
export interface AggregateResponse {
  [key: string]: {
    buckets?: Array<{ key: string; doc_count: number }>;
    statistics?: {
      minimum?: number;
      maximum?: number;
      mean?: number;
      median?: number;
      mode?: number;
    };
  };
}

export interface NumericValuesResponse {
  [key: string]: {
    values: number[];
    frequencies: number[];
  };
}

export interface WordCloudResponse {
  num_hits: number;
  aggregations: Record<string, number>;
}

// API functions for explore page
export async function fetchAggregateData(
  filters: Record<string, string[]> = {}
): Promise<AggregateResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, values]) => {
    if (values.length > 0) {
      values.forEach((value) => {
        queryParams.append(key, value);
      });
    }
  });

  const response = await fetch(
    `${API_BASE}/discover/aggregate?${queryParams.toString()}`,
    {
      headers: {
        accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch aggregate data");
  }

  return response.json();
}

export async function fetchNumericValues(
  filters: Record<string, string[]> = {}
): Promise<NumericValuesResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, values]) => {
    if (values.length > 0) {
      values.forEach((value) => {
        queryParams.append(key, value);
      });
    }
  });

  const response = await fetch(
    `${API_BASE}/discover/get_numeric_values?${queryParams.toString()}`,
    {
      headers: {
        accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch numeric values");
  }

  return response.json();
}

export async function fetchWordCloud(
  filters: Record<string, string[]> = {}
): Promise<WordCloudResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, values]) => {
    if (values.length > 0) {
      values.forEach((value) => {
        queryParams.append(key, value);
      });
    }
  });

  const response = await fetch(
    `${API_BASE}/discover/get_word_cloud?${queryParams.toString()}`,
    {
      headers: {
        accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch word cloud data");
  }

  return response.json();
}
