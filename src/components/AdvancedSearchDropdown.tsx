"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Popover,
  Typography,
  FormControlLabel,
  Switch,
  Slider,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";

interface AdvancedSearchDropdownProps {
  useSearch2: boolean;
  onEndpointChange: (useSearch2: boolean) => void;
  hybridWeight: number;
  onHybridWeightChange: (weight: number) => void;
}

export default function AdvancedSearchDropdown({
  useSearch2,
  onEndpointChange,
  hybridWeight,
  onHybridWeightChange,
}: AdvancedSearchDropdownProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const open = Boolean(anchorEl);

  const handleClick = () => {
    setAnchorEl(buttonRef.current);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEndpointToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    onEndpointChange(event.target.checked);
  };

  const handleHybridWeightChange = (
    event: Event,
    newValue: number | number[]
  ) => {
    onHybridWeightChange(newValue as number);
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          ref={buttonRef}
          variant="contained"
          color="secondary"
          onClick={handleClick}
          sx={{
            minWidth: 0,
            width: 40,
            height: 40,
            borderRadius: "50%",
            p: 0,
          }}
        >
          {open ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
        </Button>
        <Typography
          sx={{ color: "#191B22", fontWeight: 500, whiteSpace: "nowrap" }}
        >
          Advanced Search
        </Typography>
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        sx={{
          mt: 1,
        }}
      >
        <Box sx={{ p: 3, minWidth: 280 }}>
          <Typography variant="h6" gutterBottom>
            Search Configuration
          </Typography>

          {/* Endpoint Toggle */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={useSearch2}
                  onChange={handleEndpointToggle}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Use Search2 Endpoint
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {useSearch2
                      ? "Using enhanced search (search2)"
                      : "Using legacy search"}
                  </Typography>
                </Box>
              }
            />
          </Box>

          {/* Hybrid Weight Slider */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={500} gutterBottom>
              Hybrid Weight: {hybridWeight.toFixed(2)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              gutterBottom
              display="block"
            >
              Controls the balance between semantic and keyword search
            </Typography>
            <Box sx={{ px: 2, mt: 2 }}>
              <Slider
                value={hybridWeight}
                onChange={handleHybridWeightChange}
                min={0}
                max={1}
                step={0.01}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => value.toFixed(2)}
                marks={[
                  { value: 0, label: "Keyword" },
                  { value: 0.5, label: "Balanced" },
                  { value: 1, label: "Semantic" },
                ]}
              />
            </Box>
          </Box>

          {/* Information */}
          <Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Tip:</strong> Hybrid weight is automatically adjusted
              based on query length. Short queries favor keyword search (lower
              values), while longer queries favor semantic search (higher
              values).
            </Typography>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
