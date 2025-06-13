"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { Close, ExpandMore, ContentCopy } from "@mui/icons-material";
import JsonTreeDialog from "@/components/JsonTreeDialog";

interface StudyDetailDebugDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  originalSearchResult?: any;
  lookupData?: any;
  finalProcessedData: any;
}

export default function StudyDetailDebugDialog({
  open,
  onClose,
  title,
  originalSearchResult,
  lookupData,
  finalProcessedData,
}: StudyDetailDebugDialogProps) {
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [selectedDataTitle, setSelectedDataTitle] = useState("");

  const handleCopyAllToClipboard = () => {
    const allData = {
      originalSearchResult,
      lookupData,
      finalProcessedData,
    };
    navigator.clipboard.writeText(JSON.stringify(allData, null, 2));
  };

  const openJsonDialog = (data: any, dataTitle: string) => {
    setSelectedData(data);
    setSelectedDataTitle(dataTitle);
    setJsonDialogOpen(true);
  };

  const DataSummary = ({ data, label }: { data: any; label: string }) => {
    if (!data) {
      return (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontStyle: "italic" }}
        >
          No {label.toLowerCase()} data available
        </Typography>
      );
    }

    const getDataSummary = (obj: any): string => {
      if (!obj || typeof obj !== "object") return "Invalid data";

      const keys = Object.keys(obj);
      const keyCount = keys.length;

      // Try to get a meaningful title
      const title =
        obj.title ||
        obj.dataset_schema?.name ||
        obj.extra_data?.name ||
        obj.name ||
        "Unnamed";

      return `${title} (${keyCount} top-level properties)`;
    };

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="body2">
          <strong>{label}:</strong> {getDataSummary(data)}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => openJsonDialog(data, `${title} - ${label}`)}
          sx={{ ml: 2 }}
        >
          View JSON
        </Button>
      </Box>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            maxHeight: "80vh",
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
          <Typography variant="h6" component="div">
            Debug Data: {title}
          </Typography>
          <Box>
            <IconButton
              onClick={handleCopyAllToClipboard}
              size="small"
              sx={{ mr: 1 }}
              title="Copy all data to clipboard"
            >
              <ContentCopy fontSize="small" />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {open && (
            <>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 3 }}>
                Data Pipeline Overview
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Original Search Result */}
                <Accordion defaultExpanded={false}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      1. Original Search Result
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      The raw data returned from the search API when this result
                      was found.
                    </Typography>
                    <DataSummary
                      data={originalSearchResult}
                      label="Original Search Result"
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Lookup Data */}
                <Accordion defaultExpanded={false}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      2. Lookup Data
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      The full data fetched from the lookup API using the UUID
                      from the search result.
                    </Typography>
                    <DataSummary data={lookupData} label="Lookup Data" />
                  </AccordionDetails>
                </Accordion>

                {/* Final Processed Data */}
                <Accordion defaultExpanded={false}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      3. Final Processed Data
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      The processed and formatted data that is displayed in the
                      StudyDetail component.
                    </Typography>
                    <DataSummary
                      data={finalProcessedData}
                      label="Final Processed Data"
                    />
                  </AccordionDetails>
                </Accordion>
              </Box>

              <Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Data Flow:</strong> Original Search Result → Lookup
                  API → Processing & Mapping → StudyDetail Component
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleCopyAllToClipboard}
            startIcon={<ContentCopy />}
          >
            Copy All Data
          </Button>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* JSON Tree Dialog for individual data views */}
      <JsonTreeDialog
        open={jsonDialogOpen}
        onClose={() => setJsonDialogOpen(false)}
        data={selectedData}
        title={selectedDataTitle}
      />
    </>
  );
}
