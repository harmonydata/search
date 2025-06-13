"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { DataGrid, GridColDef, QuickFilter, QuickFilterControl, GridRowSelectionModel, useGridApiContext, useGridApiRef } from "@mui/x-data-grid";
import { Box, TextField, InputAdornment, Checkbox, Typography, IconButton, Tooltip, Popover, List, ListItem, ListItemText, ListItemIcon } from "@mui/material";
import { Download, FileJson, FileText, Table } from "lucide-react";

import './MatchedVariablesDataGrid.css';

// Declare the custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'harmony-export': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        questions?: Array<{
          question_text: string;
          question_no: string | number;
        }>;
        instrument_name?: string;
        size?: string;
      }
    }
  }
}

interface Variable {
  name: string;
  description?: string;
  uuid?: string;
  score?: number;
}

interface MatchedVariablesDataGridProps {
  variables: Variable[];
  studyName?: string;
}

export default function MatchedVariablesDataGrid({ variables, studyName }: MatchedVariablesDataGridProps) {
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>()
  const harmonyExportRef = useRef<HTMLElement>(null);
  const [downloadAnchorEl, setDownloadAnchorEl] = useState<null | HTMLElement>(null);
  console.log("variables passed:", variables)

  useEffect(() => {
    // Load the Harmony Export web component script from our local server
    const script = document.createElement('script');
    script.src = '/js/harmony-export.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup: remove the script when component unmounts
      document.body.removeChild(script);
    };
  }, []);

  const columns: GridColDef[] = [
    {
      field: "description",
      headerName: "Description / Code",
      flex: 1,
      valueGetter: (value: any, row: any) => (row.score?"[MATCHING] ":"" ) + (row.description || row.name) + ((row.description && row.name) ? " ("+row.name+")":""),
      sortable: false,
    }
  ];

  // Only include variables with a name or description
  const rows = variables.filter(v => v.name || v.description).map((v, i) => ({ id: v.uuid || v.name || i, ...v }));

  // Get selected variables using the grid API
  const apiRef = useGridApiRef();
  
  const handleDownloadClick = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadAnchorEl(event.currentTarget);
  };

  const handleDownloadClose = () => {
    setDownloadAnchorEl(null);
  };

  const getQuestionsData = () => {
    const api = apiRef.current;
    if (!api) return [];
    const rows = api.getSelectedRows().size > 0 
      ? Array.from(api.getSelectedRows().values())
      : Array.from(api.getRowModels().values());
    return rows.map((row, i) => ({
      question_no: row.description ? row.name : i,
      question_text: row.description || row.name
    }));
  };

  const downloadAsJson = () => {
    const data = getQuestionsData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleDownloadClose();
  };

  const downloadAsCsv = () => {
    const data = getQuestionsData();
    const csv = [
      ['Question Number', 'Question Text'],
      ...data.map(q => [q.question_no, q.question_text])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleDownloadClose();
  };

  const downloadAsExcel = () => {
    const data = getQuestionsData();
    const csv = [
      ['Question Number', 'Question Text'],
      ...data.map(q => [q.question_no, q.question_text])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleDownloadClose();
  };

  const makeHarmonyExportButton = () => {
    const api = apiRef.current;
    if (!api || !harmonyExportRef.current) return;
    const selectedIds = api.getSelectedRows();
    console.log("selectedIds:", selectedIds);
    const questions = Array.from(selectedIds.values()).map((row, i) => ({
      question_no: row.description ? row.name : i,
      question_text: row.description || row.name
    }));
    const harmonyLink = document.createElement("harmony-export") as any;
    harmonyLink.size = "32px";
    harmonyLink.instrument_name = `${studyName || "Selected Variables"} from harmonydata.ac.uk/discover`;
    harmonyLink.questions = questions;
    harmonyExportRef.current.innerHTML = "";
    harmonyExportRef.current.appendChild(harmonyLink);
  };

  return (
    <Box>
      <DataGrid
        apiRef={apiRef}
        rows={rows}
        columns={columns}
        checkboxSelection
        disableRowSelectionOnClick
        onRowSelectionModelChange={makeHarmonyExportButton}
        keepNonExistentRowsSelected
        sortModel={[{ field: 'score', sort: 'desc' }]}
        sx={{
          background: "white",
          borderRadius: 2,
          fontSize: 14,
          minHeight: 200,
          maxHeight: 400,
        }}
        hideFooterSelectedRowCount
        pageSizeOptions={[10, 25, 50]}
        showToolbar
        slots={{ toolbar: () => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
            <QuickFilter expanded={true}>
              <QuickFilterControl
                placeholder="Search within variables"
                style={{
                  background: "white",
                  borderRadius: 192,
                  fontSize: 14,
                  margin: 15,
                  width: "calc(100% - 30px)",
                  height: "auto",
                }}
              />
            </QuickFilter>
            <Tooltip title="Harmonise selected items">
              <Box ref={harmonyExportRef as any}>
                <IconButton size="small">
                  <Box ref={harmonyExportRef as any}/>
                </IconButton>
              </Box>
            </Tooltip>
            <Tooltip title="Download questions">
              <IconButton size="small" onClick={handleDownloadClick}>
                <Download size={20} />
              </IconButton>
            </Tooltip>
            <Popover
              open={Boolean(downloadAnchorEl)}
              anchorEl={downloadAnchorEl}
              onClose={handleDownloadClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <List sx={{ width: 200 }}>
                <ListItem onClick={downloadAsJson} sx={{ cursor: 'pointer' }}>
                  <ListItemIcon>
                    <FileJson size={20} />
                  </ListItemIcon>
                  <ListItemText primary="Download as JSON" />
                </ListItem>
                <ListItem onClick={downloadAsCsv} sx={{ cursor: 'pointer' }}>
                  <ListItemIcon>
                    <FileText size={20} />
                  </ListItemIcon>
                  <ListItemText primary="Download as CSV" />
                </ListItem>
                <ListItem onClick={downloadAsExcel} sx={{ cursor: 'pointer' }}>
                  <ListItemIcon>
                    <Table size={20} />
                  </ListItemIcon>
                  <ListItemText primary="Download as Excel" />
                </ListItem>
              </List>
            </Popover>
          </Box>
        )}}
      />
    </Box>
  );
} 