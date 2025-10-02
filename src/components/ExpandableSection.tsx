"use client";

import { useState } from "react";
import { Box, Collapse } from "@mui/material";
import { ChevronDown, ChevronUp } from "lucide-react";
import SquareChip from "@/components/SquareChip";

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  count?: number | string;
  variant?: "primary" | "secondary";
  sx?: any;
}

const ExpandableSection = ({
  title,
  children,
  defaultExpanded = false,
  count,
  variant = "secondary",
  sx = {},
}: ExpandableSectionProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const displayTitle = count ? `${title} (${count})` : title;

  return (
    <Box sx={{ mb: 4, ...sx }}>
      <SquareChip
        fullWidth
        chipVariant={variant}
        endIcon={
          expanded ? (
            <ChevronUp
              size={16}
              style={{
                fill: variant === "secondary" ? "#004735" : undefined,
                stroke: "none",
              }}
            />
          ) : (
            <ChevronDown
              size={16}
              style={{
                fill: variant === "secondary" ? "#004735" : undefined,
                stroke: "none",
              }}
            />
          )
        }
        sx={{ justifyContent: "space-between", py: 2, height: "auto" }}
        onClick={() => setExpanded(!expanded)}
      >
        {displayTitle}
      </SquareChip>
      <Collapse in={expanded}>
        <Box
          sx={{
            p: 2,
            bgcolor: "rgba(0, 0, 0, 0.02)",
            borderRadius: 2,
            mb: 2,
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};

export default ExpandableSection;
