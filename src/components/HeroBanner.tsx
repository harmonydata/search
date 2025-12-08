"use client";

import { Box, Typography, Chip } from "@mui/material";
import { Search } from "lucide-react";

interface HeroBannerProps {
  title?: string;
  subtitle?: string;
  onExampleClick?: (query: string) => void;
}

const exampleSearches = [
  "Find studies that contain variables related to psychosis in adolescence",
  "Show me datasets related to domestic violence and also capture socioeconomic data",
  "I'm interested in dementia in ethnic minorities",
  "Risk factors of heart disease",
];

export default function HeroBanner({
  title = "What is your research question? Try searching in complete terms",
  subtitle,
  onExampleClick,
}: HeroBannerProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        p: 4,
        mb: 4,
      }}
    >
      <Typography
        variant="h4"
        sx={{
          color: "text.primary",
          fontWeight: 600,
          textAlign: "center",
          mb: 4,
        }}
      >
        {title}
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "center",
          width: "100%",
          maxWidth: 800,
          mb: 4,
        }}
      >
        {exampleSearches.map((example, index) => (
          <Chip
            key={index}
            label={example}
            onClick={() => {
              if (onExampleClick) {
                onExampleClick(example);
              }
            }}
            icon={<Search size={18} />}
            sx={{
              width: "100%",
              justifyContent: "flex-start",
              height: "auto",
              py: 1.5,
              px: 2,
              backgroundColor: "#E3F2FD",
              color: "#1565C0",
              fontWeight: 500,
              fontSize: "0.95rem",
              cursor: "pointer",
              "&:hover": {
                backgroundColor: "#BBDEFB",
              },
              "& .MuiChip-icon": {
                color: "#1565C0",
                marginLeft: 1,
              },
            }}
          />
        ))}
      </Box>

      <Typography
        variant="body1"
        sx={{
          color: "text.secondary",
          textAlign: "center",
          maxWidth: 800,
          lineHeight: 1.6,
        }}
      >
        Harmony can understand your search term and will search for studies and
        datasets that contain related variables. You can also search using the
        filters or specific keywords or topics.
      </Typography>
    </Box>
  );
}
