"use client";

import { useState, useRef } from "react";
import { Box, Button, Popover, Typography } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import SearchVersionToggle from "./advanced-search/SearchVersionToggle";
import HybridWeightSlider from "./advanced-search/HybridWeightSlider";
import MaxDistanceSlider from "./advanced-search/MaxDistanceSlider";
import DirectMatchWeightSlider from "./advanced-search/DirectMatchWeightSlider";
import PaginationStrategyToggle from "./advanced-search/PaginationStrategyToggle";

export default function AdvancedSearchDropdown() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const open = Boolean(anchorEl);

  const handleClick = () => {
    setAnchorEl(buttonRef.current);
  };

  const handleClose = () => {
    setAnchorEl(null);
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

          {/* SearchVersionToggle hidden but code left in place */}
          {/* <SearchVersionToggle /> */}
          <HybridWeightSlider />
          <MaxDistanceSlider />
          <PaginationStrategyToggle />
          <DirectMatchWeightSlider />

          {/* Information */}
          <Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Tip:</strong> Adjust the hybrid weight to balance between
              keyword search (lower values) and semantic search (higher values).
              The default value of 0.5 provides a balanced approach.
            </Typography>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
