const API_BASE = "https://harmonydiscoveryapiweaviate.fastdatascience.com";

export interface AggregateFilter {
  id: string;
  label: string;
  options: string[];
  type?: "multiselect" | "range";
}

export interface SearchResult {
  id?: string;
  title?: string;
  resource_type?: string;
  keywords?: string[];
  description?: string;
  hasVariables?: boolean;
  hasCohortsAvailable?: boolean;
  hasFreeAccess?: boolean;
  study_variable_relationship?: {
    parent: string;
  };
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
  extra_data?: {
    country_codes?: string[];
    study_design?: string[];
    age_upper?: number;
    age_lower?: number;
    uuid?: string;
  };
  distance?: number;
  cosine_similarity?: number;
  score?: number;
  match_type?: string[];
  variables_which_matched?: {
    name: string;
    description?: string;
    uuid?: string;
  }[];
}

export interface SearchResponse {
  results: SearchResult[];
  aggregations: Record<string, any>;
  num_hits?: number;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
  if (typeof window !== 'undefined') {
    // @ts-ignore - Adding debug property to window
    window.__lastAggregateResponse = data;
    console.log("Aggregate API response cached in window.__lastAggregateResponse for debugging");
    
    // Log a summary of the aggregations
    console.log("Aggregate response:", {
      aggregationKeys: Object.keys(data.aggregations || {}),
      sampleKeys: Object.keys(data.aggregations || {}).slice(0, 3).map(key => ({
        key,
        value: data.aggregations[key]
      }))
    });
  }
  
  // data should have an 'aggregations' property
  const aggregations = data.aggregations || {};
  const filters: AggregateFilter[] = Object.keys(aggregations).map((key) => {
    return {
      id: key,
      label: capitalize(key),
      options: Object.keys(aggregations[key]),
    };
  });
  return filters;
}

export async function fetchSearchResults(
  query: string,
  filters?: Record<string, string[]>,
  // page: number = 1,
  resultsPerPage: number = 20
): Promise<SearchResponse> {
  const params = new URLSearchParams();

  // Set query parameter - the new API expects an array of query strings via multiple 'query' parameters
  if (query) params.append("query", query);

  // Add limit parameter (no offset for now)
  // const offset = (page - 1) * resultsPerPage;
  params.set("num_results", resultsPerPage.toString());
  // params.set("offset", offset.toString());

  // Append each filter value as a separate query parameter if values exist
  if (filters) {
    for (const key in filters) {
      filters[key].forEach((value) => {
        // The new API uses the exact parameter name (without adding 's')
        params.append(key, value);
      });
    }
  }

  const url = `${API_BASE}/discover/search?${params.toString()}`;
  console.log("Search URL:", url);

  const response = await fetch(url);
  if (!response.ok) {
    console.error("Search API error:", response.status, await response.text());
    throw new Error("Search API request failed");
  }

  const data = await response.json();
  
  // Store response in window object for debugging
  if (typeof window !== 'undefined') {
    // @ts-ignore - Adding debug property to window
    window.__lastSearchResponse = data;
    console.log("Search API response cached in window.__lastSearchResponse for debugging");
    
    // Log details of the response for debugging
    console.log("Search results:", {
      totalHits: data.num_hits,
      resultCount: data.results?.length || 0,
      firstResult: data.results?.[0],
      aggregations: Object.keys(data.aggregations || {})
    });
  }
  
  // Transform the response if needed to match the expected structure
  // The new API returns a structure with results and aggregations directly
  return {
    results: data.results || [],
    aggregations: data.aggregations || {},
    num_hits: data.num_hits,
  } as SearchResponse;
}
