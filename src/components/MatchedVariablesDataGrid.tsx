"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  DataGrid,
  GridColDef,
  QuickFilter,
  QuickFilterControl,
  GridRowSelectionModel,
  useGridApiContext,
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
} from "lucide-react";
import * as XLSX from "xlsx";

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
}

interface Variable {
  name: string;
  description?: string;
  uuid?: string;
  score?: number;
  options?: string[];
}

interface MatchedVariablesDataGridProps {
  variables: Variable[];
  studyName?: string;
  // Download state props only
  downloadAnchorEl?: HTMLElement | null;
  onDownloadClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onDownloadClose?: () => void;
}

interface MatchedVariablesWrapperProps {
  variables: Variable[];
  studyName?: string;
}

function MatchedVariablesDataGrid({
  variables,
  studyName,
  downloadAnchorEl,
  onDownloadClick,
  onDownloadClose,
}: MatchedVariablesDataGridProps) {
  const harmonyExportRef = useRef<HTMLElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

  const [isApiReady, setIsApiReady] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  console.log("variables passed:", variables);

  useEffect(() => {
    // Load the Harmony Export web component script from our local server
    // Only load if the custom element is not already defined
    if (customElements.get("harmony-export")) {
      return;
    }

    const script = document.createElement("script");
    script.src = "/app/js/harmony-export.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup: remove the script when component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const columns: GridColDef[] = [
    {
      field: "description",
      headerName: "Description / Code",
      flex: 2,
      valueGetter: (value: any, row: any) =>
        (row.description || row.name) +
        (row.description && row.name ? " (" + row.name + ")" : ""),
      sortable: true,
    },
    {
      field: "options",
      headerName: "Response Options",
      flex: 1,
      valueGetter: (value: any, row: any) =>
        row.options && Array.isArray(row.options)
          ? row.options.join(" / ")
          : "",
      sortable: true,
    },
  ];

  // Only include variables with a name or description
  const rows = variables
    .filter((v) => v.name || v.description)
    .map((v, i) => ({ id: v.uuid || v.name || i, ...v }));

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

  // Check for selection
  const checkSelection = useCallback(() => {
    const api = apiRef.current;
    if (!api || !isApiReady) return;

    try {
      const selectedRows = api.getSelectedRows();
      const hasSelection =
        selectedRows &&
        typeof selectedRows.size === "number" &&
        selectedRows.size > 0;
      const count =
        selectedRows && typeof selectedRows.size === "number"
          ? selectedRows.size
          : 0;
      setHasSelection(hasSelection);
      setSelectedCount(count);
    } catch (e) {
      setHasSelection(false);
      setSelectedCount(0);
    }
  }, [isApiReady]);

  // Get number of selected items
  const getSelectedCount = () => {
    return selectedCount;
  };

  // Listen for selection changes using DataGrid events instead of polling
  useEffect(() => {
    if (!isApiReady || !apiRef.current) return;

    const api = apiRef.current;

    // Use DataGrid's built-in selection change event
    const handleSelectionChange = () => {
      checkSelection();
    };

    // Subscribe to selection changes
    api.subscribeEvent("selectionChange", handleSelectionChange);

    return () => {
      // Cleanup subscription
      try {
        api.unsubscribeEvent("selectionChange", handleSelectionChange);
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [isApiReady]);

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

    return rows.map((row, i) => ({
      question_no: row.description ? row.name : i,
      question_text: row.description || row.name,
      response_options:
        row.options && Array.isArray(row.options)
          ? row.options.join(" / ")
          : "",
    }));
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
    const csv = [
      ["Question Number", "Question Text", "Response Options"],
      ...data.map((q) => [q.question_no, q.question_text, q.response_options]),
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

  const downloadAsExcel = () => {
    const data = getQuestionsData();

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
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

  const makeHarmonyExportButton = useCallback(() => {
    const api = apiRef.current;
    if (!api || !harmonyExportRef.current || !isApiReady) return;

    // Add comprehensive null checks to prevent TypeError during initial render
    let selectedIds;
    try {
      selectedIds = api.getSelectedRows();
    } catch (e) {
      selectedIds = null;
    }

    if (!selectedIds || typeof selectedIds.size !== "number") return;

    console.log("selectedIds:", selectedIds);
    const questions = Array.from(selectedIds.values()).map((row, i) => ({
      question_no: row.description ? row.name : i,
      question_text: row.description || row.name,
    }));
    const harmonyLink = document.createElement("harmony-export") as any;
    harmonyLink.size = "32px";
    harmonyLink.instrument_name = `${
      studyName || "Selected Variables"
    } from harmonydata.ac.uk/discover`;
    harmonyLink.questions = questions;
    harmonyExportRef.current.innerHTML = "";
    harmonyExportRef.current.appendChild(harmonyLink);
  }, [isApiReady, studyName]);

  // Update harmony export when selection changes
  useEffect(() => {
    // Only run when API is ready
    if (!isApiReady) return;

    // Small delay to ensure DataGrid API is ready
    const timer = setTimeout(() => {
      makeHarmonyExportButton();
    }, 100);

    return () => clearTimeout(timer);
  }, [isApiReady, hasSelection, selectedCount]);

  return (
    <>
      <Box sx={{ height: "100%", minHeight: 400 }}>
        {rows.length > 0 && (
          <DataGrid
            //autoPageSize
            apiRef={apiRef}
            paginationMode="server"
            rows={rows}
            columns={columns}
            checkboxSelection
            disableRowSelectionOnClick
            sortModel={[{ field: "score", sort: "desc" }]}
            getRowClassName={(params) =>
              params.row.matched ? "matched-row" : ""
            }
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
            hideFooter
            pageSizeOptions={[20, 50, 100]}
            showToolbar
            slots={{
              toolbar: () => (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1,
                    mr: 2,
                  }}
                >
                  <QuickFilter expanded={true} style={{ width: "100%" }}>
                    <QuickFilterControl
                      placeholder="Search within variables"
                      style={{
                        background: "white",
                        borderRadius: 192,
                        fontSize: 14,
                        margin: 15,
                        width: "calc(100% - 15px)",
                        height: "auto",
                      }}
                    />
                  </QuickFilter>
                  {hasSelection && (
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
                  )}
                  <Tooltip
                    title={
                      hasSelection
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
