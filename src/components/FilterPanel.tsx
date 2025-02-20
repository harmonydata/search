"use client";

import { useState } from "react";
import { Box, Chip } from "@mui/material";
import { ChevronDownIcon } from "lucide-react";

// Top level filter categories with their options
const filterCategories = [
  {
    id: "type",
    label: "Type",
    options: ["Study", "Dataset", "Instrument", "Variable"],
  },
  {
    id: "population",
    label: "Population",
    options: ["Children", "Adolescents", "Adults", "Elderly"],
  },
  {
    id: "topic",
    label: "Topic",
    options: [
      "Anxiety",
      "ADHD",
      "Depression",
      "Obesity",
      "Smoking",
      "Adolescents",
    ],
  },
  {
    id: "source",
    label: "Source",
    options: ["Academic", "Government", "Non-profit", "Private"],
  },
  {
    id: "country",
    label: "Country",
    options: ["United Kingdom", "United States", "Canada", "Australia"],
  },
  {
    id: "studyCharacteristics",
    label: "Study Characteristics",
    options: ["Longitudinal", "Cross-sectional", "Cohort", "Case-control"],
  },
];

export default function FilterPanel() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    "type"
  );
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleOptionClick = (option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  };

  const selectedCategoryOptions =
    filterCategories.find((category) => category.id === selectedCategory)
      ?.options || [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
      {/* Top level filter categories */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {filterCategories.map((category) => (
          <Chip
            key={category.id}
            label={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  color: "primary.main",
                  fontWeight: 500,
                }}
              >
                <ChevronDownIcon
                  size={14}
                  style={{
                    marginRight: 8,
                    fill: "currentColor",
                    stroke: "none",
                  }}
                />
                {category.label}
              </Box>
            }
            onClick={() => handleCategoryClick(category.id)}
            variant="outlined"
            sx={{
              borderRadius: "20px",
              height: "40px",
              pl: "16px",
              pr: "24px",
              bgcolor:
                selectedCategory === category.id
                  ? "primary.main"
                  : "transparent",
              color:
                selectedCategory === category.id
                  ? "primary.contrastText"
                  : "primary.main",
              borderColor: (theme) =>
                selectedCategory === category.id
                  ? theme.palette.primary.main
                  : theme.palette.grey[600],
              "& .MuiChip-label": {
                px: 0,
                fontWeight: 500,
              },
              "&:hover": {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                borderColor: "primary.main",
                "& .MuiBox-root": {
                  color: "primary.contrastText",
                },
              },
            }}
          />
        ))}
      </Box>

      {/* Second row - filter options */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          minHeight: 40,
          transition: "all 0.2s ease-in-out",
        }}
      >
        {selectedCategoryOptions.map((option) => (
          <Chip
            key={option}
            label={option}
            onClick={() => handleOptionClick(option)}
            variant="outlined"
            sx={{
              borderRadius: "20px",
              height: "40px",
              pl: "16px",
              pr: "24px",
              color: selectedOptions.includes(option)
                ? "primary.contrastText"
                : "primary.main",
              bgcolor: selectedOptions.includes(option)
                ? "primary.main"
                : "transparent",
              borderColor: (theme) =>
                selectedOptions.includes(option)
                  ? theme.palette.primary.main
                  : theme.palette.grey[600],
              "& .MuiChip-label": {
                px: 0,
                fontWeight: 500,
              },
              "&:hover": {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                borderColor: "primary.main",
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
