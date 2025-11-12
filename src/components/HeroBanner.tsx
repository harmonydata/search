"use client";

import { Box, Typography, Link } from "@mui/material";

interface HeroBannerProps {
  title?: string;
  subtitle?: string;
  onExampleClick?: (query: string) => void;
}

const exampleSearches = [
  "Why are more children obese now?",
  "What factors influence mental health in teenagers?",
  "How does income affect educational outcomes?",
];

export default function HeroBanner({
  title = "Discover Research Studies",
  subtitle = "Search or filter to begin",
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
        minHeight: 200,
        p: 4,
        borderRadius: 4,
        background: `linear-gradient(135deg, #27EDB9 0%, #2E5FFF 100%)`,
        boxShadow: "0 8px 32px rgba(46, 95, 255, 0.15)",
        mb: 4,
      }}
    >
      <Typography
        variant="h4"
        sx={{
          color: "white",
          fontWeight: 600,
          textAlign: "center",
          mb: 2,
          textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          color: "white",
          fontWeight: 400,
          textAlign: "center",
          opacity: 0.9,
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
          mb: 3,
        }}
      >
        {subtitle}
      </Typography>

      <Box sx={{ mt: 2, textAlign: "center", maxWidth: 600 }}>
        <Typography
          variant="body1"
          sx={{
            color: "white",
            fontWeight: 400,
            textAlign: "center",
            opacity: 0.95,
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
            mb: 2,
          }}
        >
          Harmony understands the meaning of your query so you can search for
          things like:
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            alignItems: "center",
          }}
        >
          {exampleSearches.map((example, index) => (
            <Link
              key={index}
              onClick={(e) => {
                e.preventDefault();
                if (onExampleClick) {
                  onExampleClick(example);
                }
              }}
              sx={{
                color: "white",
                textDecoration: "underline",
                textDecorationColor: "rgba(255, 255, 255, 0.6)",
                textUnderlineOffset: 4,
                cursor: "pointer",
                fontWeight: 500,
                "&:hover": {
                  textDecorationColor: "white",
                  opacity: 1,
                },
                transition: "all 0.2s ease",
              }}
            >
              {example}
            </Link>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
