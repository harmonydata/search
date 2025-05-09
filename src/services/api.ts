const API_BASE = "https://harmonydiscoveryapiweaviate.fastdatascience.com";

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
  }[];
}

export interface SearchResponse {
  results: SearchResult[];
  aggregations: Record<string, any>;
  num_hits?: number;
}

// Improved function to format labels nicely
function formatLabel(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
  resultsPerPage: number = 10
): Promise<SearchResponse> {
  const params = new URLSearchParams();


  // Set query parameter - never send an empty query to avoid 500 errors
  // If query is empty, use "*" as a wildcard
  const safeQuery = !query || query.trim() === "" ? "*" : query.trim();
  
  // force keyword search if query is a single word or a wildcard 
  if(!(safeQuery === "*" || safeQuery.split(" ").length > 1)) {
    params.set("query_type", "keyword");
  } else {
    params.set("query_type", "hybrid");
  }

  params.append("query", safeQuery);

  // Add limit parameter (no offset for now)
  const offset = (page - 1) * resultsPerPage;
  params.set("num_results", resultsPerPage.toString());
  params.set("offset", offset.toString());

  // Group numeric range params for better logging
  const numericRangeParams: Record<string, {min?: string, max?: string}> = {};
  
  // Append each filter value as a separate query parameter if values exist
  if (filters) {
    for (const key in filters) {
      // Handle the case of min/max parameters for numeric fields
      if (key.endsWith('_min') || key.endsWith('_max')) {
        // Extract the base field name
        const fieldName = key.replace(/_(min|max)$/, '');
        
        // Initialize entry if it doesn't exist
        if (!numericRangeParams[fieldName]) {
          numericRangeParams[fieldName] = {};
        }
        
        // Set min or max value
        if (key.endsWith('_min')) {
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

  const url = `${API_BASE}/discover2/search?${params.toString()}`;
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

export async function fetchResultByUuid(uuid: string): Promise<SearchResult> {
  const url = `${API_BASE}/discover2/lookup?uuid=${uuid}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    console.error('Failed to fetch result by UUID:', response.statusText);
    throw new Error(`Failed to fetch result by UUID: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Store the response in window for debugging
  if (typeof window !== 'undefined') {
    // @ts-ignore - Adding debug property to window
    window.__lastLookupResponse = data;
  }
  
  return data.results[0];
}
