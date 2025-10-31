"use client";

import React, { useState } from "react";
import {
  Fab,
  Tooltip,
  Popover,
  Box,
  Typography,
  Rating,
  TextField,
  Button,
  Stack,
  IconButton,
} from "@mui/material";
import {
  Feedback as FeedbackIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

interface FeedbackButtonProps {
  onSubmitFeedback?: (rating: number | null, comment: string) => void;
}

export default function FeedbackButton({
  onSubmitFeedback,
}: FeedbackButtonProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    // Reset form when closing
    setRating(null);
    setComment("");
  };

  const handleSubmit = async () => {
    if (!rating) return;

    setIsSubmitting(true);
    try {
      await onSubmitFeedback?.(rating, comment);
      handleClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Give feedback" placement="left">
        <Fab
          color="primary"
          size="small"
          onClick={handleClick}
          sx={{
            position: "fixed",
            bottom: 0,
            right: 0,
            zIndex: 1000,
            boxShadow: 3,
            borderRadius: "4px 0 0 0", // Rounded only on top-left to avoid being cut off
          }}
        >
          <FeedbackIcon />
        </Fab>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "center",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "center",
          horizontal: "right",
        }}
        sx={{
          "& .MuiPopover-paper": {
            borderRadius: 2,
            boxShadow: 3,
          },
        }}
      >
        <Box sx={{ p: 3, minWidth: 300 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" component="h2">
              Share your feedback
            </Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                How would you rate your experience?
              </Typography>
              <Rating
                name="feedback-rating"
                value={rating}
                onChange={(event, newValue) => {
                  setRating(newValue);
                }}
                size="large"
              />
            </Box>

            <TextField
              multiline
              rows={3}
              placeholder="Tell us what you think... (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
            />

            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button size="small" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleSubmit}
                disabled={!rating || isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
