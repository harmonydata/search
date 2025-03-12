const API_BASE = "https://harmonydiscoveryapiweaviate.fastdatascience.com";

export interface AggregateFilter {
  id: string;
  label: string;
  options: string[];
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
  dataset_schema?: any;
  extra_data?: any;
  distance?: number;
  cosine_similarity?: number;
  score?: number;
  match_type?: string[];
  variables_which_matched?: any[];
  parent?: any;
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
  filters?: Record<string, string[]>
): Promise<SearchResponse> {
  const params = new URLSearchParams();

  // Set query parameter - the new API expects an array of query strings via multiple 'query' parameters
  if (query) params.append("query", query);

  // Add default num_results parameter
  params.set("num_results", "100");

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
  
  // Transform the response if needed to match the expected structure
  // The new API returns a structure with results and aggregations directly
  return {
    results: data.results || [],
    aggregations: data.aggregations || {},
    num_hits: data.num_hits,
  } as SearchResponse;
}
