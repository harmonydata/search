const API_BASE = "https://harmonydataweaviate.azureedge.net";

export interface AggregateFilter {
  id: string;
  label: string;
  options: string[];
  type?: "multiselect" | "range";
  frequencies?: Record<string, number>;
}
export interface VariableSchema {
  name: string;
  description?: string;
  question?: string;
  options?: string[];
  response_options?: string[];
  cosine_similarity?: number;
  source?: string[];
  keywords?: string[];
}

export interface SearchResult {
  child_datasets: SearchResult[];
  // New fields from the Weaviate API
  dataset_schema?: {
    "@context"?: string;
    "@type"?: string;
    name?: string;
    description?: string;
    url?: string[];
    keywords?: string[];
    identifier?: string[];
    variableMeasured?: VariableSchema[];
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
    copyrightHolder?: {
      "@type"?: string;
      name?: string;
    }[];
    sponsor?: {
      "@type"?: string;
      name?: string;
    }[];
    image?: string;
    size?: string;
    temporalCoverage?: string;
    license?: string[];
    // Optional fields that may be added in the future
    spatialCoverage?: string;
    distribution?: any;
    dateCreated?: string;
    dateModified?: string;
    number_of_variables?: number;
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
    slug?: string;
    // New fields
    instruments?: string[];
    harmony_id?: string;
    sample_size?: number;
    geographic_coverage?: string[];
    end_year?: number;
    language_codes?: string[];
    duration_years?: number;
    dois?: string[];
    data_access?: string;
    source?: string;
    num_sweeps?: number;
    urls?: string[];
    start_year?: number;
    keywords?: string[];
    sex?: string;
    genetic_data_collected?: boolean;
    num_variables?: number;
    number_of_variables?: number;
    ai_summary?: string;
  };
  distance?: number;
  cosine_similarity?: number;
  hasFreeAccess?: boolean;
  hasCohortsAvailable?: boolean;
  score?: number;
  match_type?: string[];
  ancestors?: SearchResult[];
  variables_which_matched?: VariableSchema[];
  datasets_which_matched?: SearchResult[];
}

export interface SearchResponse {
  results: SearchResult[];
  aggregations: Record<string, any>;
  num_hits?: number;
  is_result_count_lower_bound?: boolean;
  top_level_ids_seen_so_far?: string[];
  next_page_offset?: number;
}

// Improved function to format labels nicely
function formatLabel(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Helper function to map filter keys to API parameter names
function mapFilterKeyToApiParam(key: string): string {
  // Currently no mappings needed - API parameters match filter keys
  return key;
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
    const aggregationData = aggregations[key];

    // For numeric fields, extract the actual numeric values from the aggregation object
    const numericFields = [
      "num_sweeps",
      "sample_size",
      "duration_years",
      "age_lower",
      "age_upper",
      "start_year",
      "end_year",
    ];
    let options: string[];

    if (
      numericFields.includes(key) &&
      typeof aggregationData === "object" &&
      !Array.isArray(aggregationData) &&
      aggregationData.minimum !== undefined &&
      aggregationData.maximum !== undefined
    ) {
      // For numeric fields, create a range from minimum to maximum
      const min = Math.floor(aggregationData.minimum);
      const max = Math.ceil(aggregationData.maximum);
      const range = [];

      // Create a reasonable number of steps (max 100 points)
      const stepCount = Math.min(100, max - min + 1);
      const step = (max - min) / (stepCount - 1);

      for (let i = 0; i < stepCount; i++) {
        range.push(String(Math.round(min + i * step)));
      }

      options = range;
    } else {
      // For non-numeric fields, use the keys as before
      options = Object.keys(aggregationData);
    }

    return {
      id: key,
      label: formatLabel(key),
      options: options,
      frequencies:
        typeof aggregationData === "object" && !Array.isArray(aggregationData)
          ? aggregationData
          : undefined,
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
  topLevelIdsSeen?: string[],
  nextPageOffset?: number,
  returnVariablesWithinParent?: boolean,
  maxVectorDistance?: number,
  directMatchWeight?: number,
  maxDistanceMode: "max_distance" | "min_score" | "both" = "min_score"
): Promise<SearchResponse> {
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
  const safeQuery = !query || query.trim() === "" ? "" : query.trim();

  // Use exclusion filter method - always use offset 0, filter by top_level_ids_seen_so_far
  const offset = 0; // Always use 0 when using exclusion method

  // Determine if we need to use POST (when we have top_level_ids_seen_so_far to exclude)
  const needsPost =
    topLevelIdsSeen && topLevelIdsSeen.length > 0 && !useSearch2;

  const endpoint = useSearch2 ? "search2" : "search";
  const baseUrl = `${API_BASE}/discover/${endpoint}`;

  let url: string;
  let requestOptions: RequestInit;

  if (needsPost) {
    // Use POST request with body for subsequent pages
    url = baseUrl;

    // Prepare request body
    const requestBody: any = {
      query: [safeQuery],
      num_results: resultsPerPage,
      offset: offset, // Always 0 when using exclusion method
    };

    // Add hybrid weight if provided
    if (hybridWeight !== undefined) {
      requestBody.alpha = hybridWeight;
    }

    // Add top_level_ids_seen_so_far array for exclusion filtering
    if (topLevelIdsSeen && topLevelIdsSeen.length > 0) {
      requestBody.top_level_ids_seen_so_far = topLevelIdsSeen;
    }

    // Add filters to request body
    if (filters) {
      Object.entries(filters).forEach(([key, values]) => {
        if (values.length > 0) {
          // Map filter key to API parameter name
          const apiParamKey = mapFilterKeyToApiParam(key);

          // Handle numeric min/max fields as single integer values
          if (key.endsWith("_min") || key.endsWith("_max")) {
            requestBody[apiParamKey] = parseInt(values[0], 10);
          } else {
            // Regular non-numeric filter - add all values
            requestBody[apiParamKey] = values;
          }
        }
      });
    }

    // Add return_variables_within_parent parameter if provided
    if (returnVariablesWithinParent !== undefined) {
      requestBody.return_variables_within_parent = returnVariablesWithinParent;
    }

    // Add max_vector_distance and/or min_original_vector_score based on mode
    if (maxVectorDistance !== undefined) {
      if (maxDistanceMode === "max_distance" || maxDistanceMode === "both") {
        requestBody.max_vector_distance = maxVectorDistance;
      }
      if (maxDistanceMode === "min_score" || maxDistanceMode === "both") {
        requestBody.min_original_vector_score = 1 - maxVectorDistance;
      }
    }

    // Add direct_match_weight parameter if provided
    // Transform 0-1 slider value to 0-10 API value
    // Piecewise linear: 0->0, 0.5->2, 1->10
    if (directMatchWeight !== undefined) {
      const apiValue =
        directMatchWeight <= 0.5
          ? 4 * directMatchWeight
          : 16 * directMatchWeight - 6;
      requestBody.direct_match_weight = apiValue;
    }

    requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    };

    console.log("Using POST request for pagination with body:", {
      query: [safeQuery],
      topLevelIdsCount: topLevelIdsSeen?.length || 0,
      offset,
      endpoint,
    });
  } else {
    // Use GET request with URL parameters (first page or old endpoint)
    const params = new URLSearchParams();

    // Add hybrid weight parameter if provided
    if (hybridWeight !== undefined) {
      params.set("alpha", hybridWeight.toString());
    }

    // Always append the query parameter, even if it's "*"
    params.append("query", safeQuery);

    // Add limit parameter and offset
    // Use nextPageOffset if provided, otherwise calculate offset
    params.set("num_results", resultsPerPage.toString());
    params.set("offset", offset.toString());

    // Group numeric range params for better logging
    const numericRangeParams: Record<string, { min?: string; max?: string }> =
      {};

    // Append each filter value as a separate query parameter if values exist
    if (filters) {
      for (const key in filters) {
        // Map filter key to API parameter name
        const apiParamKey = mapFilterKeyToApiParam(key);

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
          params.append(apiParamKey, filters[key][0]);
        } else {
          // Regular non-numeric filter - add all values
          filters[key].forEach((value) => {
            params.append(apiParamKey, value);
          });
        }
      }
    }

    // Add return_variables_within_parent parameter if provided
    if (returnVariablesWithinParent !== undefined) {
      params.set(
        "return_variables_within_parent",
        returnVariablesWithinParent.toString()
      );
    }

    // Add max_vector_distance and/or min_original_vector_score based on mode
    if (maxVectorDistance !== undefined) {
      if (maxDistanceMode === "max_distance" || maxDistanceMode === "both") {
        params.set("max_vector_distance", maxVectorDistance.toString());
      }
      if (maxDistanceMode === "min_score" || maxDistanceMode === "both") {
        params.set(
          "min_original_vector_score",
          (1 - maxVectorDistance).toString()
        );
      }
    }

    // Add direct_match_weight parameter if provided
    // Transform 0-1 slider value to 0-10 API value
    // Piecewise linear: 0->0, 0.5->2, 1->10
    if (directMatchWeight !== undefined) {
      const apiValue =
        directMatchWeight <= 0.5
          ? 4 * directMatchWeight
          : 16 * directMatchWeight - 6;
      params.set("direct_match_weight", apiValue.toString());
    }

    url = `${baseUrl}?${params.toString()}`;
    requestOptions = {
      method: "GET",
    };

    // Log numeric range parameters for debugging
    if (Object.keys(numericRangeParams).length > 0) {
      console.log("Numeric range parameters:", numericRangeParams);
    }

    console.log("Using GET request:", url);
  }

  const response = await fetch(url, requestOptions);
  if (!response.ok) {
    console.error("Search API error:", response.status, await response.text());
    throw new Error("Search API request failed");
  }

  const data = await response.json();

  // Track top_level_ids_seen_so_far for duplicate detection (but don't send it to API)
  const seenIds = new Set<string>(topLevelIdsSeen || []);
  const duplicateIds: string[] = [];

  // Check for duplicates in the response
  if (data.results && Array.isArray(data.results)) {
    data.results.forEach((result: any) => {
      const resultId =
        result.extra_data?.uuid || result.dataset_schema?.identifier?.[0];
      if (resultId) {
        if (seenIds.has(resultId)) {
          duplicateIds.push(resultId);
        } else {
          seenIds.add(resultId);
        }
      }
    });
  }

  // Alert if duplicates found (shouldn't happen with offset-based pagination)
  if (duplicateIds.length > 0 && typeof window !== "undefined") {
    alert(
      `⚠️ Duplicate results detected!\n\n` +
        `Found ${duplicateIds.length} duplicate result(s) that were already seen.\n` +
        `This shouldn't happen with offset-based pagination.\n\n` +
        `Duplicate IDs: ${duplicateIds.slice(0, 5).join(", ")}${
          duplicateIds.length > 5 ? "..." : ""
        }\n\n` +
        `Please check the console for more details.`
    );
    console.error("Duplicate results detected:", {
      count: duplicateIds.length,
      ids: duplicateIds,
      currentOffset: offset,
      resultsReturned: data.results?.length || 0,
    });
  }

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
      method: needsPost ? "POST" : "GET",
      hybridWeight: hybridWeight,
      offset: offset,
      duplicatesDetected: duplicateIds.length,
    });
  }

  // Transform the response if needed to match the expected structure
  // The new API returns a structure with results and aggregations directly
  // NOTE: We still return top_level_ids_seen_so_far for tracking, but don't send it in requests
  return {
    results: data.results || [],
    aggregations: data.aggregations || {},
    num_hits: data.num_hits,
    top_level_ids_seen_so_far: Array.from(seenIds), // Return updated tracking set
    next_page_offset: data.next_page_offset,
  } as SearchResponse;
}

export async function fetchResultsByUuids(
  uuids: string[],
  query?: string,
  alpha?: number,
  maxVectorDistance?: number,
  maxDistanceMode: "max_distance" | "min_score" | "both" = "min_score"
): Promise<SearchResult[]> {
  console.log(`🔗 API CALL: fetchResultsByUuids(${uuids.length} UUIDs)`);
  const params = new URLSearchParams();

  // Append all UUIDs
  for (const uuid of uuids) {
    params.append("uuid", uuid);
  }

  // Append query parameter if provided
  if (query && query.trim()) {
    params.set("query", query.trim());
  }

  // Append alpha parameter if provided
  if (alpha !== undefined) {
    params.set("alpha", alpha.toString());
  }

  // Add max_vector_distance and/or min_original_vector_score based on mode
  if (maxVectorDistance !== undefined) {
    if (maxDistanceMode === "max_distance" || maxDistanceMode === "both") {
      params.set("max_vector_distance", maxVectorDistance.toString());
    }
    if (maxDistanceMode === "min_score" || maxDistanceMode === "both") {
      params.set("min_original_vector_score", (1 - maxVectorDistance).toString());
    }
  }

  const url = `${API_BASE}/discover/lookup?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.error("Failed to fetch results by UUIDs:", response.statusText);
    throw new Error(`Failed to fetch results by UUIDs: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results || [];
}

export async function fetchResultByUuid(
  identifier: string,
  query?: string,
  alpha?: number,
  maxVectorDistance?: number,
  maxDistanceMode: "max_distance" | "min_score" | "both" = "min_score"
): Promise<SearchResult> {
  console.log(`🔗 API CALL: fetchResultByUuid(${identifier})`);
  const params = new URLSearchParams();

  // Check if identifier is a UUID (with dashes) or hash-based ID (32 hex chars)
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      identifier
    ) || /^[0-9a-f]{32}$/i.test(identifier);

  if (isUUID) {
    params.set("uuid", identifier);
  } else {
    params.set("slug", identifier);
  }

  // Append query parameter if provided
  if (query && query.trim()) {
    params.set("query", query.trim());
  }

  // Append alpha parameter if provided
  if (alpha !== undefined) {
    params.set("alpha", alpha.toString());
  }

  // Add max_vector_distance and/or min_original_vector_score based on mode
  if (maxVectorDistance !== undefined) {
    if (maxDistanceMode === "max_distance" || maxDistanceMode === "both") {
      params.set("max_vector_distance", maxVectorDistance.toString());
    }
    if (maxDistanceMode === "min_score" || maxDistanceMode === "both") {
      params.set("min_original_vector_score", (1 - maxVectorDistance).toString());
    }
  }

  const url = `${API_BASE}/discover/lookup?${params.toString()}`;
  const response = await fetch(url);

  // If UUID lookup failed with 404, try as slug
  if (!response.ok && isUUID && response.status === 404) {
    console.log(`UUID lookup failed for ${identifier}, trying as slug...`);

    const slugParams = new URLSearchParams();
    slugParams.set("slug", identifier);

    // Append query parameter if provided
    if (query && query.trim()) {
      slugParams.set("query", query.trim());
    }

    // Append alpha parameter if provided
    if (alpha !== undefined) {
      slugParams.set("alpha", alpha.toString());
    }

    // Add max_vector_distance and/or min_original_vector_score based on mode
    if (maxVectorDistance !== undefined) {
      if (maxDistanceMode === "max_distance" || maxDistanceMode === "both") {
        slugParams.set("max_vector_distance", maxVectorDistance.toString());
      }
      if (maxDistanceMode === "min_score" || maxDistanceMode === "both") {
        slugParams.set(
          "min_original_vector_score",
          (1 - maxVectorDistance).toString()
        );
      }
    }

    const slugUrl = `${API_BASE}/discover/lookup?${slugParams.toString()}`;
    const slugResponse = await fetch(slugUrl);

    if (slugResponse.ok) {
      const slugData = await slugResponse.json();

      // Store the response in window for debugging
      if (typeof window !== "undefined") {
        // @ts-ignore - Adding debug property to window
        window.__lastLookupResponse = slugData;
      }

      return slugData.results[0];
    }
  }

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

// Function to clean URLs by removing extra closing brackets
function cleanUrl(url: string): string {
  if (!url || typeof url !== "string") {
    return url;
  }

  // Check if URL ends with a closing bracket and has unbalanced brackets
  if (url.endsWith(")")) {
    // Count opening and closing brackets
    const openBrackets = (url.match(/\(/g) || []).length;
    const closeBrackets = (url.match(/\)/g) || []).length;

    // If we have more closing brackets than opening brackets, remove the extra ones
    if (closeBrackets > openBrackets) {
      const extraBrackets = closeBrackets - openBrackets;
      // Remove the extra closing brackets from the end
      let cleanedUrl = url;
      for (let i = 0; i < extraBrackets; i++) {
        if (cleanedUrl.endsWith(")")) {
          cleanedUrl = cleanedUrl.slice(0, -1);
        }
      }

      // Log the cleaning for debugging
      if (cleanedUrl !== url) {
        console.log(
          `Cleaned URL: "${url}" -> "${cleanedUrl}" (removed ${extraBrackets} extra closing brackets)`
        );
      }

      return cleanedUrl;
    }
  }

  return url;
}

export async function fetchOgData(url: string): Promise<any> {
  // Clean the URL before making the request
  const cleanedUrl = cleanUrl(url);

  const response = await fetch(
    `https://harmonydata.azureedge.net/api/ogData?url=${encodeURIComponent(
      cleanedUrl
    )}`
  );

  // Handle forbidden/blocked errors by returning fallback data
  if (!response.ok) {
    // If we get a 403 (forbidden) or similar, return usable fallback data
    if (
      response.status === 403 ||
      response.status === 429 ||
      response.status === 451
    ) {
      try {
        const urlObj = new URL(cleanedUrl);
        const hostname = urlObj.hostname;
        const origin = urlObj.origin;

        return {
          title: hostname,
          description: `Link to ${hostname}`,
          image: `${origin}/favicon.ico`,
          url: cleanedUrl,
          siteName: hostname,
          type: "website",
          favicon: `${origin}/favicon.ico`,
          originalUrl: cleanedUrl,
          finalUrl: cleanedUrl,
          isFallback: true,
        };
      } catch (e) {
        // If URL parsing fails, still return basic fallback
        return {
          title: cleanedUrl,
          description: "",
          image: "",
          url: cleanedUrl,
          siteName: "",
          type: "website",
          favicon: "",
          originalUrl: cleanedUrl,
          finalUrl: cleanedUrl,
          isFallback: true,
        };
      }
    }

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

export async function fetchKeywordPhrases(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/info/get-keyword-search-terms`);
  if (!response.ok) {
    console.error("Failed to fetch keyword phrases:", response.statusText);
    throw new Error("Failed to fetch keyword phrases");
  }
  const data = await response.json();

  // Store response in window object for debugging
  if (typeof window !== "undefined") {
    // @ts-ignore - Adding debug property to window
    window.__lastKeywordPhrasesResponse = data;
    console.log(
      "Keyword phrases API response cached in window.__lastKeywordPhrasesResponse for debugging"
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

export interface SourceInfo {
  "@context": string;
  "@type": string;
  name: string;
  alternateName: string;
  url: string;
  logo: string;
}

export interface SourcesResponse {
  [key: string]: SourceInfo;
}

export async function fetchSources(): Promise<SourcesResponse> {
  const response = await fetch(`${API_BASE}/discover/sources`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch sources data");
  }

  return response.json();
}

export async function fetchStudyBySlug(slug: string): Promise<SearchResult> {
  const response = await fetchSearchResults(
    "*", // Use wildcard
    {
      resource_type: ["study"],
      slug: [slug], // Filter by slug
    },
    1, // First page
    1, // Just need one result
    false // Use new search endpoint
  );

  if (!response.results || response.results.length === 0) {
    throw new Error(`Study with slug "${slug}" not found`);
  }

  return response.results[0];
}

export async function fetchAllStudySlugs(): Promise<string[]> {
  const response = await fetchSearchResults(
    "*", // Use wildcard to get all results
    { resource_type: ["study"] }, // Filter for studies only
    1, // First page
    1000, // Get a large number of results
    false // Use new search endpoint
  );

  const slugs =
    response.results
      ?.map((study) => study.extra_data?.slug)
      .filter((slug): slug is string => Boolean(slug)) || [];

  return slugs;
}

export async function fetchAllStudiesWithUuids(): Promise<
  Array<{ slug: string; uuid: string }>
> {
  console.log(`🔗 API CALL: fetchAllStudiesWithUuids()`);
  const allStudies: Array<{ slug: string; uuid: string }> = [];
  let offset = 0;
  const pageSize = 500;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await fetchSearchResults(
        "*", // Use wildcard to get all results
        { resource_type: ["study"] }, // Filter for studies only
        1, // First page
        pageSize, // Get 500 results at a time
        false, // Use new search endpoint
        undefined, // hybridWeight
        undefined, // topLevelIdsSeen
        offset // Use offset for pagination
      );

      const studiesWithUuids =
        response.results
          ?.map((study) => ({
            slug: study.extra_data?.slug,
            uuid: study.extra_data?.uuid,
          }))
          .filter((study): study is { slug: string; uuid: string } =>
            Boolean(study.slug && study.uuid)
          ) || [];

      allStudies.push(...studiesWithUuids);

      // Check if we got fewer results than requested, meaning we've reached the end
      hasMore = studiesWithUuids.length === pageSize;
      offset += pageSize;
    } catch (error) {
      console.warn(
        `Failed to fetch studies at offset ${offset}, stopping pagination:`,
        error
      );
      hasMore = false;
    }
  }

  return allStudies;
}

export async function fetchAllDatasetsWithUuids(): Promise<
  Array<{ slug: string; uuid: string }>
> {
  console.log(`🔗 API CALL: fetchAllDatasetsWithUuids()`);
  const allDatasets: Array<{ slug: string; uuid: string }> = [];
  let offset = 0;
  const pageSize = 500;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await fetchSearchResults(
        "*", // Use wildcard to get all results
        { resource_type: ["dataset"] }, // Filter for datasets only
        1, // First page
        pageSize, // Get 500 results at a time
        false, // Use new search endpoint
        undefined, // hybridWeight
        undefined, // topLevelIdsSeen
        offset, // Use offset for pagination
        false // returnVariablesWithinParent = false to get datasets with slugs
      );

      const datasetsWithUuids =
        response.results
          ?.map((dataset) => ({
            slug: dataset.extra_data?.slug,
            uuid: dataset.extra_data?.uuid,
          }))
          .filter((dataset): dataset is { slug: string; uuid: string } =>
            Boolean(dataset.slug && dataset.uuid)
          ) || [];

      allDatasets.push(...datasetsWithUuids);

      // Check if we got fewer results than requested, meaning we've reached the end
      hasMore = datasetsWithUuids.length === pageSize;
      offset += pageSize;
    } catch (error) {
      console.warn(
        `Failed to fetch datasets at offset ${offset}, stopping pagination:`,
        error
      );
      hasMore = false;
    }
  }

  return allDatasets;
}

// Types for the cleanup API
export type CleanupType = "summarise_URL" | "summarise_text";

export interface CleanupRequest {
  text: string;
  system_prompt: string;
}

export interface CleanupResponse {
  result: string;
  type: CleanupType;
}

// System prompts for different types
const SYSTEM_PROMPTS: Record<CleanupType, string> = {
  summarise_URL:
    "You are a helpful assistant that summarizes academic research datasets. You will receive a JSON object containing dataset schema information including metadata and other details. The dataset may include a variableCount field indicating the number of variables measured. Please provide a concise, informative summary that highlights the key aspects of the dataset, including its purpose, scope, the types of variables measured (based on the count and other metadata), and any other relevant information that would help researchers understand what this dataset contains.",
  summarise_text:
    "You are a helpful assistant that summarizes academic research datasets. You will receive a JSON object containing dataset schema information including metadata and other details. The dataset may include a variableCount field indicating the number of variables measured. Please provide a concise, informative summary that highlights the key aspects of the dataset, including its purpose, scope, the types of variables measured (based on the count and other metadata), and any other relevant information that would help researchers understand what this dataset contains.",
};

// Knowledge-based system prompt for when we want AI to use its own knowledge
const KNOWLEDGE_BASED_PROMPT =
  "You are a helpful assistant that summarizes academic research studies and datasets based on your knowledge. You will receive the name/title of a study or dataset. Please provide a concise, informative summary based on what you know about this study, including its purpose, scope, methodology, key findings, and significance. IMPORTANT: Only provide a summary if you have specific knowledge about this exact study or dataset. If the name is too generic (like 'Next Steps', 'Study', 'Survey', etc.) or if you are not familiar with the specific study, return an empty response (no text at all). Do not provide general information or explanations about why you cannot help.";

// Cleanup API function
export async function cleanupText(
  datasetSchema: any,
  type: CleanupType
): Promise<CleanupResponse> {
  const systemPrompt = SYSTEM_PROMPTS[type];

  // Convert the dataset schema to a JSON string
  const contentToProcess = JSON.stringify(datasetSchema, null, 2);

  const response = await fetch(
    "https://harmonyplugincleanuptext.fastdatascience.com/api/cleanup",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: contentToProcess,
        system: systemPrompt,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Cleanup API request failed: ${response.statusText}`);
  }

  const result = await response.json();

  return {
    result: result.result || result, // Handle different response formats
    type,
  };
}

// Knowledge-based cleanup function that uses AI's existing knowledge
export async function cleanupTextFromKnowledge(
  studyName: string
): Promise<CleanupResponse> {
  // Create URL with query parameters for CDN caching
  const url = new URL("https://harmonydatagpt.azureedge.net/api/cleanup");
  url.searchParams.set("text", studyName);
  url.searchParams.set("system", KNOWLEDGE_BASED_PROMPT);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Cleanup API request failed: ${response.statusText}`);
  }

  const result = await response.json();

  return {
    result: result.result || result, // Handle different response formats
    type: "summarise_text",
  };
}

// Response interface for get-variables endpoint
export interface VariablesResponse {
  results: VariableSchema[];
  num_hits?: number;
  next_page_offset?: number;
}

// Function to fetch variables from the new get-variables endpoint
export async function fetchVariables(options: {
  ancestor_uuid?: string;
  query?: string;
  num_results?: number;
  offset?: number;
  alpha?: number;
  max_vector_distance?: number;
  direct_match_weight?: number;
  max_distance_mode?: "max_distance" | "min_score" | "both";
}): Promise<VariablesResponse> {
  const params = new URLSearchParams();

  // Add ancestor_uuid (applies to both top-level studies and child datasets)
  if (options.ancestor_uuid) {
    params.set("ancestor_uuid", options.ancestor_uuid);
  }

  // Add query parameter if provided
  if (options.query && options.query.trim()) {
    params.set("query", options.query.trim());
  }

  // Add pagination parameters
  if (options.num_results !== undefined) {
    params.set("num_results", options.num_results.toString());
  }
  if (options.offset !== undefined) {
    params.set("offset", options.offset.toString());
  }

  // Add search config parameters
  if (options.alpha !== undefined) {
    params.set("alpha", options.alpha.toString());
  }
  // Add max_vector_distance and/or min_original_vector_score based on mode
  const mode = options.max_distance_mode || "min_score";
  if (options.max_vector_distance !== undefined) {
    if (mode === "max_distance" || mode === "both") {
      params.set("max_vector_distance", options.max_vector_distance.toString());
    }
    if (mode === "min_score" || mode === "both") {
      params.set(
        "min_original_vector_score",
        (1 - options.max_vector_distance).toString()
      );
    }
  }
  if (options.direct_match_weight !== undefined) {
    // Transform 0-1 slider value to 0-10 API value (same as search)
    // Piecewise linear: 0->0, 0.5->2, 1->10
    const apiValue =
      options.direct_match_weight <= 0.5
        ? 4 * options.direct_match_weight
        : 16 * options.direct_match_weight - 6;
    params.set("direct_match_weight", apiValue.toString());
  }

  const url = `${API_BASE}/discover/get-variables?${params.toString()}`;
  console.log(`🔗 API CALL: fetchVariables(${url})`);

  const response = await fetch(url);

  if (!response.ok) {
    console.error("Failed to fetch variables:", response.statusText);
    throw new Error(`Failed to fetch variables: ${response.statusText}`);
  }

  const data = await response.json();

  // Store response in window object for debugging
  if (typeof window !== "undefined") {
    // @ts-ignore - Adding debug property to window
    window.__lastVariablesResponse = data;
    console.log(
      "Variables API response cached in window.__lastVariablesResponse for debugging"
    );
  }

  return {
    results: data.results || [],
    num_hits: data.num_hits,
    next_page_offset: data.next_page_offset,
  } as VariablesResponse;
}
