"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Box,
  Typography,
  IconButton,
  Stack,
  MenuItem,
  Select,
  InputLabel,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { SearchResult } from "@/services/api";
import { SearchSettings } from "@/contexts/SearchContext";

interface SearchFeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedback: SearchFeedbackData) => Promise<void>;
  reportedResult?: SearchResult;
  searchContext: {
    searchSettings: SearchSettings;
    displayedResults: SearchResult[];
    resultIndex: number; // Index of the reported result in displayedResults
  };
}

export interface SearchFeedbackData {
  reason: "wrong_place" | "too_high" | "too_low" | "inappropriate" | "something_else" | "";
  comment: string;
  reportedResult: SearchResult;
  searchContext: {
    searchSettings: SearchSettings;
    displayedResults: SearchResult[];
    resultIndex: number;
  };
}

export default function SearchFeedbackDialog({
  open,
  onClose,
  onSubmit,
  reportedResult: initialReportedResult,
  searchContext,
}: SearchFeedbackDialogProps) {
  const [reason, setReason] = useState<string>("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(
    initialReportedResult
      ? searchContext.resultIndex >= 0
        ? searchContext.resultIndex
        : searchContext.displayedResults.findIndex(
            (r) => r.extra_data?.uuid === initialReportedResult.extra_data?.uuid
          )
      : -1
  );

  // Reset selected result when initialReportedResult changes
  useEffect(() => {
    if (initialReportedResult) {
      const index = searchContext.displayedResults.findIndex(
        (r) => r.extra_data?.uuid === initialReportedResult.extra_data?.uuid
      );
      setSelectedResultIndex(index >= 0 ? index : searchContext.resultIndex);
    } else if (searchContext.resultIndex >= 0) {
      setSelectedResultIndex(searchContext.resultIndex);
    }
  }, [initialReportedResult, searchContext]);

  const reportedResult =
    selectedResultIndex >= 0 &&
    selectedResultIndex < searchContext.displayedResults.length
      ? searchContext.displayedResults[selectedResultIndex]
      : initialReportedResult;

  const handleClose = () => {
    setReason("");
    setComment("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) {
      setError("Please select a reason");
      return;
    }

    if (!reportedResult) {
      setError("No result selected for reporting");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    if (!reportedResult) {
      setError("Please select a result to report");
      return;
    }

    try {
      const feedbackData: SearchFeedbackData = {
        reason: reason as
          | "wrong_place"
          | "too_high"
          | "too_low"
          | "inappropriate"
          | "something_else",
        comment: comment.trim(),
        reportedResult,
        searchContext: {
          ...searchContext,
          resultIndex: selectedResultIndex,
        },
      };

      await onSubmit(feedbackData);
      handleClose();
    } catch (err) {
      console.error("Error submitting search feedback:", err);
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">Report Search Result Issue</Typography>
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Result selector - only show if no initial result provided */}
          {!initialReportedResult &&
            searchContext.displayedResults.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Select result to report</InputLabel>
                <Select
                  value={selectedResultIndex}
                  onChange={(e) => {
                    setSelectedResultIndex(e.target.value as number);
                    setError(null);
                  }}
                  label="Select result to report"
                >
                  {searchContext.displayedResults.map((result, index) => (
                    <MenuItem key={index} value={index}>
                      {result.dataset_schema?.name ||
                        result.extra_data?.name ||
                        `Result ${index + 1}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

          {reportedResult && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Reporting issue with:
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {reportedResult.dataset_schema?.name ||
                  reportedResult.extra_data?.name ||
                  "Unknown result"}
              </Typography>
            </Box>
          )}

          <FormControl component="fieldset">
            <FormLabel component="legend">What's the issue?</FormLabel>
            <RadioGroup
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
            >
              <FormControlLabel
                value="too_high"
                control={<Radio />}
                label="Too high in results"
              />
              <FormControlLabel
                value="too_low"
                control={<Radio />}
                label="Too low in results"
              />
              <FormControlLabel
                value="inappropriate"
                control={<Radio />}
                label="Shouldn't be in results at all"
              />
              <FormControlLabel
                value="something_else"
                control={<Radio />}
                label="Something else"
              />
            </RadioGroup>
          </FormControl>

          <TextField
            multiline
            rows={4}
            placeholder="Additional comments (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            variant="outlined"
            fullWidth
          />

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!reason || isSubmitting || !reportedResult}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
