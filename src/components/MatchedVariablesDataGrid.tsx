"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  DataGrid,
  GridColDef,
  QuickFilter,
  QuickFilterControl,
  useGridApiRef,
} from "@mui/x-data-grid";
import {
  Box,
  TextField,
  InputAdornment,
  Checkbox,
  Typography,
  IconButton,
  Tooltip,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  Download,
  FileJson,
  FileText,
  Table,
  Maximize2,
  X,
  Search,
  ExternalLink,
} from "lucide-react";
import { VariableSchema, fetchVariables, SearchResult } from "@/services/api";
// XLSX will be loaded dynamically when needed to reduce bundle size
import { loadHarmonyExportComponent } from "@/utilities/harmonyExportLoader";

import "./MatchedVariablesDataGrid.css";

// Declare the custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "harmony-export": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        questions?: Array<{
          question_text: string;
          question_no: string | number;
        }>;
        instrument_name?: string;
        size?: string;
      };
    }
  }
  // Declare global XLSX object from the loaded script
  var XLSX: {
    utils: {
      json_to_sheet: (data: any[]) => any;
      book_new: () => any;
      book_append_sheet: (wb: any, ws: any, name: string) => void;
    };
    write: (wb: any, opts: { bookType: string; type: string }) => any;
  };
}

// Helper function to load XLSX script from public folder
const loadXLSX = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if XLSX is already loaded
    if (typeof window !== "undefined" && (window as any).XLSX) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src="/js/xlsx.min.js"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", reject);
      return;
    }

    // Load the script
    const script = document.createElement("script");
    script.src = "/js/xlsx.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

interface MatchedVariablesDataGridProps {
  variables?: VariableSchema[]; // Optional - if studyUuid provided, will fetch from API
  studyName?: string;
  // Server-side fetching props
  studyUuid?: string; // If provided, will fetch variables from API using ancestor_uuid
  studyAncestors?: SearchResult[]; // Ancestors array (kept for potential future use, but not used for API calls)
  query?: string; // Main search query (for matching mode)
  variablesWhichMatched?: VariableSchema[]; // Variables that matched the search
  alpha?: number;
  maxVectorDistance?: number;
  maxDistanceMode?: "max_distance" | "min_score" | "both";
  directMatchWeight?: number;
  // Callback to notify parent of total variable count
  onTotalCountChange?: (count: number | null) => void;
  // Callback to notify parent if table should be hidden
  onShouldHideTable?: (shouldHide: boolean) => void;
  // Download state props only
  downloadAnchorEl?: HTMLElement | null;
  onDownloadClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onDownloadClose?: () => void;
}

interface MatchedVariablesWrapperProps {
  variables?: VariableSchema[];
  studyName?: string;
  // Server-side fetching props
  studyUuid?: string;
  studyAncestors?: SearchResult[];
  query?: string;
  variablesWhichMatched?: VariableSchema[];
  alpha?: number;
  maxVectorDistance?: number;
  maxDistanceMode?: "max_distance" | "min_score" | "both";
  directMatchWeight?: number;
  // Callback to notify parent of total variable count
  onTotalCountChange?: (count: number | null) => void;
  onShouldHideTable?: (shouldHide: boolean) => void;
}

function MatchedVariablesDataGrid({
  variables: propsVariables,
  studyName,
  studyUuid,
  studyAncestors,
  query: mainSearchQuery,
  variablesWhichMatched,
  alpha,
  maxVectorDistance,
  maxDistanceMode,
  directMatchWeight,
  onTotalCountChange,
  onShouldHideTable,
  downloadAnchorEl,
  onDownloadClick,
  onDownloadClose,
}: MatchedVariablesDataGridProps) {
  const harmonyExportRef = useRef<HTMLElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

  const [isApiReady, setIsApiReady] = useState(false);
  const [totalVariableCount, setTotalVariableCount] = useState<number | null>(null);
  const [shouldHideTable, setShouldHideTable] = useState(false);
  const [allVariables, setAllVariables] = useState<VariableSchema[]>([]);
  const [loadingAllVariables, setLoadingAllVariables] = useState(false);
  
  // Debouncing for search queries
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRequestRef = useRef<{ resolve: (value: any) => void; reject: (error: any) => void } | null>(null);
  const lastFilterQueryRef = useRef<string>("");
  const lastPaginationRef = useRef<{ page: number; pageSize: number } | null>(null);
  const lastSortModelRef = useRef<any[]>([]);
  
  // Initialize filter model with mainSearchQuery if available
  const initialState = useMemo(() => {
    if (mainSearchQuery && mainSearchQuery.trim().length > 0) {
      return {
        filter: {
          filterModel: {
            items: [],
            quickFilterValues: [mainSearchQuery.trim()],
          },
        },
      };
    }
    return undefined;
  }, [mainSearchQuery]);
  
  // Create dataSource for server-side fetching - but we'll use client-side filtering on allVariables
  // Set to undefined if we have allVariables loaded (will use rows instead)
  const dataSource = useMemo(() => {
    if (!studyUuid) return undefined;
    // If we have allVariables loaded, don't use dataSource - use client-side mode
    if (allVariables.length > 0) return undefined;
    
    return {
      getRows: async (params: any) => {
        // Extract search query from filterModel (QuickFilter sets this)
        // QuickFilter uses the "quickFilterValues" in filterModel
        const quickFilterValue = params.filterModel?.quickFilterValues?.[0] || "";
        const searchQuery = quickFilterValue;
        
        // Handle paginationModel (can be undefined in some cases)
        const paginationModel = params.paginationModel || { page: 0, pageSize: 50 };
        
        // Extract sortModel from params
        const sortModel = params.sortModel || [];
        
        // Check if this is a filter change (query changed), pagination change, or sort change
        const isFilterChange = searchQuery !== lastFilterQueryRef.current;
        const isPaginationChange = 
          !lastPaginationRef.current ||
          paginationModel.page !== lastPaginationRef.current.page ||
          paginationModel.pageSize !== lastPaginationRef.current.pageSize;
        const isSortChange = JSON.stringify(sortModel) !== JSON.stringify(lastSortModelRef.current);
        
        // Update refs
        lastFilterQueryRef.current = searchQuery;
        lastPaginationRef.current = paginationModel;
        lastSortModelRef.current = sortModel;
        
        // For filter changes, debounce the request
        // For pagination or sort changes, execute immediately
        if (isFilterChange && !isPaginationChange && !isSortChange) {
          // Cancel previous debounce timeout
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }
          
          // Cancel previous pending request if any
          if (pendingRequestRef.current) {
            pendingRequestRef.current.reject(new Error("Request cancelled by new filter"));
          }
          
          // Return a promise that will be resolved after debounce
          return new Promise<{ rows: any[]; rowCount: number }>((resolve, reject) => {
            pendingRequestRef.current = { resolve, reject };
            
            debounceTimeoutRef.current = setTimeout(async () => {
              try {
                const result = await executeFetch();
                pendingRequestRef.current?.resolve(result);
                pendingRequestRef.current = null;
              } catch (error) {
                pendingRequestRef.current?.reject(error);
                pendingRequestRef.current = null;
              }
            }, 500); // 500ms debounce delay
          });
        }
        
        // For pagination changes or initial load, execute immediately
        return executeFetch();
        
        // Helper function to execute the actual fetch
        async function executeFetch() {
          // Convert sortModel to API sort_order format
          // Format: "field_name:asc" or "field_name:desc"
          // If multiple sorts, use the first one (API likely supports single sort)
          let sortOrder: string | undefined = undefined;
          if (sortModel && sortModel.length > 0) {
            const firstSort = sortModel[0];
            const field = firstSort.field;
            const direction = firstSort.sort || "asc";
            sortOrder = `${field}:${direction}`;
          }
          
          const fetchOptions: Parameters<typeof fetchVariables>[0] = {
            // Use ancestor_uuid for all cases (works for both top-level studies and child datasets)
            ancestor_uuid: studyUuid,
            // Only include query if we have one
            query: searchQuery && searchQuery.trim() ? searchQuery.trim() : undefined,
            num_results: paginationModel.pageSize,
            offset: paginationModel.page * paginationModel.pageSize,
            alpha: alpha,
            max_vector_distance: maxVectorDistance,
            max_distance_mode: maxDistanceMode,
            direct_match_weight: directMatchWeight,
            sort_order: sortOrder,
          };
        
        try {
          let response = await fetchVariables(fetchOptions);
          let results = response.results || [];
          
          // If no results and we have a search query, try again without the query
          // Only do this on the first page (offset 0) to avoid retrying on every page
          if (results.length === 0 && 
              searchQuery && 
              searchQuery.trim() && 
              paginationModel.page === 0 && 
              paginationModel.pageSize > 0) {
            const retryOptions: Parameters<typeof fetchVariables>[0] = {
              ...fetchOptions,
              query: undefined, // Remove query for retry
            };
            
            response = await fetchVariables(retryOptions);
            results = response.results || [];
            
            // If still no results, hide the table
            if (results.length === 0 && (response.num_hits === 0 || response.num_hits === undefined)) {
              setShouldHideTable(true);
              onShouldHideTable?.(true);
            } else {
              setShouldHideTable(false);
              onShouldHideTable?.(false);
            }
          } else {
            // If we have results or no search query, show the table
            setShouldHideTable(false);
            onShouldHideTable?.(false);
          }
          
          // Create a Set of matched variable names for quick lookup
          const matchedVariableNames = new Set<string>();
          if (variablesWhichMatched && variablesWhichMatched.length > 0) {
            variablesWhichMatched.forEach((matchedVar) => {
              if (matchedVar.name) {
                matchedVariableNames.add(matchedVar.name);
              }
            });
          }
          
          // Count occurrences of each variable name within the current page
          const nameCounts = new Map<string, number>();
          results.forEach((row: any) => {
            const key = row.name || 'unnamed';
            nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
          });
          
          // Create rows with unique IDs and display names with counters
          const rowsWithIds = results.map((row: any, index: number) => {
            const name = row.name || 'unnamed';
            const count = nameCounts.get(name) || 1;
            
            // Create unique ID using name, index, and offset to ensure uniqueness
            const offset = paginationModel.page * paginationModel.pageSize;
            const uniqueId = `${name}-${offset}-${index}`;
            
            // Add display name with counter if there are duplicates
            const displayName = count > 1 
              ? `${name} (x${count})`
              : name;
            
            // Determine if this variable is matched by checking if it's in variablesWhichMatched array
            const isMatched = matchedVariableNames.has(name);
            
            return {
              ...row,
              id: uniqueId, // Ensure unique ID
              originalIndex: index,
              displayName: displayName,
              repeatCount: count,
              matched: isMatched, // Set matched property for highlighting
            };
          });
          
          // Determine the actual row count
          // If num_hits is provided from API, use it (it's the accurate count)
          // Otherwise, calculate based on results length
          const currentOffset = paginationModel.page * paginationModel.pageSize;
          const hasFilter = searchQuery && searchQuery.trim().length > 0;
          
          let actualRowCount: number;
          
          // If API provided num_hits, use it directly (most accurate)
          if (response.num_hits !== undefined && response.num_hits !== null) {
            actualRowCount = response.num_hits;
            
            // Store total count (unfiltered) if we're on first page with no filter
            if (currentOffset === 0 && !hasFilter && totalVariableCount !== response.num_hits) {
              setTotalVariableCount(response.num_hits);
              onTotalCountChange?.(response.num_hits);
            }
          } else {
            // API didn't provide num_hits, calculate based on results length
            const resultsLength = results.length;
            if (resultsLength < paginationModel.pageSize) {
              // Got fewer results than requested - we've reached the end
              // Exact count = (page * pageSize) + number of results
              actualRowCount = currentOffset + resultsLength;
            } else {
              // Got a full page - we don't know if there are more
              // Minimum count = (page + 1) * pageSize (the number of the final item on this page)
              const minimumCount = (paginationModel.page + 1) * paginationModel.pageSize;
              
              // If we have a stored total and no filter, use that
              // Otherwise, use minimum count (which represents "at least this many")
              if (!hasFilter && totalVariableCount !== null) {
                actualRowCount = totalVariableCount;
              } else {
                // For filtered results or when we don't know total, use minimum
                // This represents "at least X items" where X is the final item number on this page
                actualRowCount = minimumCount;
              }
            }
          }
          
          return {
            rows: rowsWithIds,
            rowCount: actualRowCount,
          };
        } catch (error) {
          console.error("Failed to fetch variables:", error);
          return {
            rows: [],
            rowCount: 0,
          };
        }
        }
      },
    };
  }, [
    studyUuid,
    alpha,
    maxVectorDistance,
    maxDistanceMode,
    directMatchWeight,
    variablesWhichMatched, // Include variablesWhichMatched so dataSource updates when it changes
  ]);
  
  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (pendingRequestRef.current) {
        pendingRequestRef.current.reject(new Error("Component unmounted"));
      }
    };
  }, []);
  
  // Reset total count when study UUID or query changes
  useEffect(() => {
    setTotalVariableCount(null);
    setAllVariables([]);
    onTotalCountChange?.(null);
  }, [studyUuid, mainSearchQuery, onTotalCountChange]);

  // Fetch all variables when studyUuid changes
  useEffect(() => {
    if (!studyUuid) {
      setAllVariables([]);
      return;
    }

    const fetchAllVariables = async () => {
      setLoadingAllVariables(true);
      try {
        // First, fetch page 1 to get the total count
        const firstPageResponse = await fetchVariables({
          ancestor_uuid: studyUuid,
          query: mainSearchQuery && mainSearchQuery.trim() ? mainSearchQuery.trim() : undefined,
          num_results: 50, // Just to get num_hits
          offset: 0,
          alpha: alpha,
          max_vector_distance: maxVectorDistance,
          max_distance_mode: maxDistanceMode,
          direct_match_weight: directMatchWeight,
        });

        const totalCount = firstPageResponse.num_hits;
        if (totalCount === undefined || totalCount === null) {
          console.warn("Could not get total variable count, cannot fetch all variables");
          setLoadingAllVariables(false);
          return;
        }

        setTotalVariableCount(totalCount);
        onTotalCountChange?.(totalCount);

        // Now fetch all variables in one call
        const allVariablesResponse = await fetchVariables({
          ancestor_uuid: studyUuid,
          query: mainSearchQuery && mainSearchQuery.trim() ? mainSearchQuery.trim() : undefined,
          num_results: totalCount, // Fetch all variables
          offset: 0,
          alpha: alpha,
          max_vector_distance: maxVectorDistance,
          max_distance_mode: maxDistanceMode,
          direct_match_weight: directMatchWeight,
        });

        setAllVariables(allVariablesResponse.results || []);
        setShouldHideTable(false);
        onShouldHideTable?.(false);
      } catch (error) {
        console.error("Failed to fetch all variables:", error);
        setAllVariables([]);
        setShouldHideTable(true);
        onShouldHideTable?.(true);
      } finally {
        setLoadingAllVariables(false);
      }
    };

    fetchAllVariables();
  }, [studyUuid, mainSearchQuery, alpha, maxVectorDistance, maxDistanceMode, directMatchWeight, onTotalCountChange, onShouldHideTable]);
  
  // Use allVariables if we have them (server-side with full fetch), otherwise use props variables (client-side)
  const variables = studyUuid && allVariables.length > 0 ? allVariables : (propsVariables || []);

  useEffect(() => {
    // Load the Harmony Export web component using centralized loader
    loadHarmonyExportComponent().catch((error) => {
      console.error("Failed to load harmony-export component:", error);
    });
  }, []);

  // Helper function to process variable data according to the schema
  const processVariableData = useCallback((variable: any, index: number) => {
    const hasQuestion =
      variable.question && variable.question.trim().length > 0;
    const hasDescription =
      variable.description && variable.description.trim().length > 0;
    const hasName = variable.name && variable.name.trim().length > 0;

    // question_no: should be `name` IF question or description exist, otherwise just an index number
    const question_no =
      (hasQuestion || hasDescription) && hasName ? variable.name : index;

    // question_text logic:
    // - description if there's no question
    // - question if there's no description
    // - name if there's neither question nor description
    // - "{question} [{description}]" if both question and description exist (unless they're the same)
    let question_text = "";
    if (hasQuestion && hasDescription) {
      const questionTrimmed = variable.question.trim();
      const descriptionTrimmed = variable.description.trim();
      // If question and description are the same, just use question
      if (questionTrimmed === descriptionTrimmed) {
        question_text = variable.question;
      } else {
        question_text = `${variable.question} [${variable.description}]`;
      }
    } else if (hasQuestion) {
      question_text = variable.question;
    } else if (hasDescription) {
      question_text = variable.description;
    } else if (hasName) {
      question_text = variable.name;
    } else {
      question_text = "";
    }

    // response_options: handle both `options` and `response_options` fields
    const responseOptions = variable.response_options || variable.options;
    const response_options =
      responseOptions && Array.isArray(responseOptions)
        ? responseOptions.join(" / ")
        : "";

    return {
      question_no,
      question_text,
      response_options,
    };
  }, []);

  // Check if any variables have response options data
  const hasResponseOptions = useMemo(() => {
    return variables.some((v) => {
      const responseOptions = v.response_options || v.options;
      return responseOptions && Array.isArray(responseOptions) && responseOptions.length > 0;
    });
  }, [variables]);

  // Check if any variables have URLs
  const hasUrls = useMemo(() => {
    return variables.some((v) => {
      return v.urls && Array.isArray(v.urls) && v.urls.length > 0;
    });
  }, [variables]);

  const columns: GridColDef[] = useMemo(() => {
    const baseColumns: GridColDef[] = [
      {
        field: "question_no",
        headerName: "Code",
        width: 120,
        valueGetter: (value: any, row: any) => {
          const processed = processVariableData(row, row.originalIndex ?? 0);
          return processed.question_no;
        },
        sortable: true,
      },
      {
        field: "description",
        headerName: "Question / Variable name",
        flex: 2,
        valueGetter: (value: any, row: any) => {
          // Use displayName if available (for server-side with deduplication), otherwise process normally
          if (row.displayName && row.repeatCount > 1) {
            // For duplicates, show the display name with counter, but still process the question text
            const processed = processVariableData(row, row.originalIndex ?? 0);
            // If we have a display name with counter, prepend it to the question text
            return processed.question_text || row.displayName;
          }
          const processed = processVariableData(row, row.originalIndex ?? 0);
          return processed.question_text;
        },
        sortable: true,
      },
    ];

    // Only include Response Options column if any variables have response options data
    if (hasResponseOptions) {
      baseColumns.push({
        field: "options",
        headerName: "Response Options",
        flex: 1,
        valueGetter: (value: any, row: any) => {
          const processed = processVariableData(row, row.originalIndex ?? 0);
          return processed.response_options;
        },
        sortable: true,
      });
    }

    // Only include URL column if any variables have URLs
    if (hasUrls) {
      baseColumns.push({
        field: "url",
        headerName: "",
        width: 60,
        sortable: false,
        renderCell: (params: any) => {
          const variable = variables[params.row.originalIndex ?? 0];
          const firstUrl = variable?.urls && Array.isArray(variable.urls) && variable.urls.length > 0
            ? variable.urls[0]
            : null;
          
          if (firstUrl) {
            return (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(firstUrl, "_blank", "noopener,noreferrer");
                }}
                sx={{ p: 0.5 }}
              >
                <ExternalLink size={16} />
              </IconButton>
            );
          }
          return null;
        },
        headerAlign: "center",
        align: "center",
      });
    }

    return baseColumns;
  }, [hasResponseOptions, hasUrls, processVariableData, variables]);

  // Only include variables with a name or description
  const rows = variables
    .filter((v) => v.name || v.description)
    .map((v, i) => ({ id: v.name || i, originalIndex: i, ...v }));

  // Get selected variables using the grid API
  const apiRef = useGridApiRef();

  // Set API ready when DataGrid is mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      if (apiRef.current) {
        setIsApiReady(true);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [apiRef]);

  // Get selected items directly from DataGrid API
  const getSelectedItems = () => {
    const api = apiRef.current;
    if (!api || !isApiReady) return [];

    try {
      const selectedRows = api.getSelectedRows();
      return selectedRows ? Array.from(selectedRows.values()) : [];
    } catch (e) {
      console.warn("Failed to get selected items:", e);
      return [];
    }
  };

  // Get number of selected items
  const getSelectedCount = () => {
    return getSelectedItems().length;
  };

  // Check if there's a selection - no state, just return boolean
  const hasSelection = () => {
    const api = apiRef.current;
    if (!api || !isApiReady) return false;

    try {
      const selectedRows = api.getSelectedRows();
      return (
        selectedRows &&
        typeof selectedRows.size === "number" &&
        selectedRows.size > 0
      );
    } catch (e) {
      return false;
    }
  };

  const makeHarmonyExportButton = useCallback(() => {
    if (!harmonyExportRef.current || !isApiReady) return;

    const selectedItems = getSelectedItems();

    // Clear the button content
    harmonyExportRef.current.innerHTML = "";

    if (selectedItems.length === 0) {
      // Show a placeholder or empty state
      return;
    }

    console.log("selectedItems:", selectedItems);
    const questions = selectedItems.map((row) => {
      const processed = processVariableData(row, row.originalIndex ?? 0);
      return {
        question_no: processed.question_no,
        question_text: processed.question_text,
      };
    });
    const harmonyLink = document.createElement("harmony-export") as any;
    harmonyLink.size = "32px";
    harmonyLink.instrument_name = `${
      studyName || "Selected Variables"
    } from harmonydata.ac.uk/discover`;
    harmonyLink.questions = questions;
    harmonyExportRef.current.appendChild(harmonyLink);
  }, [isApiReady, studyName]);

  // Listen for selection changes using DataGrid events
  useEffect(() => {
    if (!isApiReady || !apiRef.current) return;

    const api = apiRef.current;

    const handleSelectionChange = () => {
      // Update harmony button with current selection
      makeHarmonyExportButton();
    };

    // Subscribe to selection changes
    const unsubscribe = api.subscribeEvent(
      "rowSelectionChange",
      handleSelectionChange
    );

    return () => {
      unsubscribe();
    };
  }, [isApiReady, makeHarmonyExportButton]);

  const handleDownloadClose = () => {
    onDownloadClose?.();
  };

  const getQuestionsData = () => {
    const api = apiRef.current;
    if (!api || !isApiReady) return [];

    // Add comprehensive null checks to prevent TypeError
    let selectedRows;
    try {
      selectedRows = api.getSelectedRows();
    } catch (e) {
      selectedRows = null;
    }

    const hasSelection =
      selectedRows &&
      typeof selectedRows.size === "number" &&
      selectedRows.size > 0;

    const rows =
      hasSelection && selectedRows
        ? Array.from(selectedRows.values())
        : (() => {
            let rowModels;
            try {
              rowModels = api.getRowModels();
            } catch (e) {
              rowModels = null;
            }
            return rowModels ? Array.from(rowModels.values()) : [];
          })();

    return rows.map((row) => {
      const processed = processVariableData(row, row.originalIndex ?? 0);
      const result: any = {
        question_no: processed.question_no,
        question_text: processed.question_text,
      };
      // Only include response_options if any variables have them
      if (hasResponseOptions) {
        result.response_options = processed.response_options;
      }
      return result;
    });
  };

  const downloadAsJson = () => {
    const data = getQuestionsData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleDownloadClose();
  };

  const downloadAsCsv = () => {
    const data = getQuestionsData();
    const headers = hasResponseOptions
      ? ["Question Number", "Question Text", "Response Options"]
      : ["Question Number", "Question Text"];
    const csv = [
      headers,
      ...data.map((q) =>
        hasResponseOptions
          ? [q.question_no, q.question_text, q.response_options]
          : [q.question_no, q.question_text]
      ),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleDownloadClose();
  };

  const downloadAsExcel = async () => {
    const data = getQuestionsData();

    // Load XLSX from local script file
    await loadXLSX();

    // Access XLSX from global scope (declared in global namespace)
    const XLSXLib =
      (typeof window !== "undefined" && (window as any).XLSX) ||
      (globalThis as any).XLSX;
    if (!XLSXLib) {
      console.error("XLSX library failed to load");
      handleDownloadClose();
      return;
    }

    // Create worksheet
    const ws = XLSXLib.utils.json_to_sheet(data);

    // Create workbook
    const wb = XLSXLib.utils.book_new();
    XLSXLib.utils.book_append_sheet(wb, ws, "Questions");

    // Generate Excel file
    const excelBuffer = XLSXLib.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleDownloadClose();
  };


  return (
    <>
      <Box sx={{ height: "100%", minHeight: 400 }}>
        {(rows.length > 0 || dataSource) && (
          <DataGrid
            apiRef={apiRef}
            {...(dataSource ? { dataSource } : { rows })}
            columns={columns}
            checkboxSelection
            sortModel={[]}
            getRowClassName={(params) =>
              params.row.matched ? "matched-row" : ""
            }
            filterMode={studyUuid && allVariables.length > 0 ? "client" : (studyUuid ? "server" : "client")}
            sortingMode={studyUuid && allVariables.length > 0 ? "client" : (studyUuid ? "server" : "client")}
            paginationMode={studyUuid && allVariables.length > 0 ? "client" : (studyUuid ? "server" : "client")}
            sx={{
              background: "white",
              borderRadius: 2,
              fontSize: 14,
              height: "100%",
              "& .matched-row": {
                backgroundColor: "#fffae4",
                "&:hover": {
                  backgroundColor: "#fff8d1",
                },
              },
            }}
            hideFooter={!studyUuid || (studyUuid && allVariables.length === 0 && !loadingAllVariables)}
            loading={loadingAllVariables || false}
            pageSizeOptions={[20, 50, 100]}
            pagination
            showToolbar
            initialState={initialState}
            slots={{
              toolbar: () => (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1,
                    mr: 2,
                    flexWrap: "wrap",
                  }}
                >
                  {/* QuickFilter - always shown */}
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <QuickFilter expanded={true} style={{ width: "100%" }}>
                      <QuickFilterControl
                        placeholder="Search within variables"
                        style={{
                          background: "white",
                          borderRadius: 192,
                          fontSize: 14,
                        }}
                      />
                    </QuickFilter>
                  </Box>
                  
                  {/* Action buttons */}
                  <Tooltip title="Harmonise selected items">
                    <IconButton size="small" sx={{ width: 40, height: 40 }}>
                      <Box
                        ref={harmonyExportRef as any}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 20,
                          height: 20,
                        }}
                      />
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={
                      hasSelection()
                        ? `Download ${getSelectedCount()} selected questions`
                        : "Download all questions"
                    }
                  >
                    <IconButton
                      ref={downloadButtonRef}
                      size="small"
                      onClick={onDownloadClick}
                      sx={{ width: 40, height: 40 }}
                    >
                      <Download size={30} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ),
            }}
          />
        )}
      </Box>

      {/* Popover positioned outside the DataGrid */}
      <Popover
        open={Boolean(downloadAnchorEl)}
        anchorEl={downloadAnchorEl}
        onClose={handleDownloadClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <List sx={{ width: 200 }}>
          <ListItem onClick={downloadAsJson} sx={{ cursor: "pointer" }}>
            <ListItemIcon>
              <FileJson size={20} />
            </ListItemIcon>
            <ListItemText primary="Download as JSON" />
          </ListItem>
          <ListItem onClick={downloadAsCsv} sx={{ cursor: "pointer" }}>
            <ListItemIcon>
              <FileText size={20} />
            </ListItemIcon>
            <ListItemText primary="Download as CSV" />
          </ListItem>
          <ListItem onClick={downloadAsExcel} sx={{ cursor: "pointer" }}>
            <ListItemIcon>
              <Table size={20} />
            </ListItemIcon>
            <ListItemText primary="Download as Excel" />
          </ListItem>
        </List>
      </Popover>
    </>
  );
}

// Wrapper component that handles the dialog state
export default function MatchedVariablesWrapper({
  variables,
  studyName,
  studyUuid,
  studyAncestors,
  query,
  variablesWhichMatched,
  alpha,
  maxVectorDistance,
  maxDistanceMode,
      directMatchWeight,
      onTotalCountChange,
      onShouldHideTable,
}: MatchedVariablesWrapperProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const dataGridRef = useRef<HTMLDivElement>(null);

  // Controlled state for DataGrid
  const [downloadAnchorEl, setDownloadAnchorEl] = useState<HTMLElement | null>(
    null
  );

  const handleDownloadClick = (event: React.MouseEvent<HTMLElement>) => {
    console.log("handleDownloadClick", event.currentTarget);
    // Use a simple approach - just set any element as anchor to position above the table
    setDownloadAnchorEl(dataGridRef.current);
  };

  const handleDownloadClose = () => {
    setDownloadAnchorEl(null);
  };

  const handleDialogOpen = () => {
    // Close any open popovers when switching to dialog
    setDownloadAnchorEl(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    // Close any open popovers when switching back to embedded
    setDownloadAnchorEl(null);
    setDialogOpen(false);
  };

  // Single DataGrid component that exists in ONE place only
  const dataGridComponent = (
    <MatchedVariablesDataGrid
      variables={variables}
      studyName={studyName}
      studyUuid={studyUuid}
      studyAncestors={studyAncestors}
      query={query}
      variablesWhichMatched={variablesWhichMatched}
      alpha={alpha}
      maxVectorDistance={maxVectorDistance}
      maxDistanceMode={maxDistanceMode}
      directMatchWeight={directMatchWeight}
      onTotalCountChange={onTotalCountChange}
      onShouldHideTable={onShouldHideTable}
      downloadAnchorEl={downloadAnchorEl}
      onDownloadClick={handleDownloadClick}
      onDownloadClose={handleDownloadClose}
    />
  );

  if (dialogOpen) {
    // Dialog version
    return (
      <Dialog
        ref={dataGridRef}
        open={true}
        onClose={handleDialogClose}
        maxWidth="xl"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            height: "90vh",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <Typography variant="h6">
            Variables - {studyName || "Study"}
          </Typography>
          <IconButton
            onClick={handleDialogClose}
            size="small"
            sx={{ color: "text.secondary" }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: "hidden" }}>
          {/* Dialog styling wrapper */}
          <Box
            sx={{
              height: "100%",
              "& .MuiDataGrid-root": {
                borderRadius: 0,
                maxHeight: "none",
                height: "100%",
              },
            }}
          >
            {dataGridComponent}
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  // Embedded version
  return (
    <Box ref={dataGridRef} sx={{ position: "relative" }}>
      <Box
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: 1,
        }}
      >
        <Tooltip title="Open in large view">
          <IconButton size="small" onClick={handleDialogOpen}>
            <Maximize2 size={20} />
          </IconButton>
        </Tooltip>
      </Box>
      {/* Embedded styling wrapper */}
      <Box
        sx={{
          "& .MuiDataGrid-root": {
            height: 450,
            borderRadius: 2,
          },
        }}
      >
        {dataGridComponent}
      </Box>
    </Box>
  );
}
