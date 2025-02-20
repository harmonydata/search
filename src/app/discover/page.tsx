"use client";

import { useState } from "react";
import {
  Box,
  Container,
  TextField,
  IconButton,
  Button,
  Typography,
} from "@mui/material";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import SearchResults from "@/components/SearchResults";
import FilterPanel from "@/components/FilterPanel";
import StudyDetail from "@/components/StudyDetail";
import SquareChip from "@/components/SquareChip";

const filterCategories = [
  { id: "type", label: "Type" },
  { id: "population", label: "Population" },
  { id: "topic", label: "Topic" },
  { id: "source", label: "Source" },
  { id: "country", label: "Country" },
  { id: "studyCharacteristics", label: "Study Characteristics" },
];

// Sample data for testing
const sampleResults = [
  {
    id: "1",
    title: "1958 National Child Development Study (NCDS)",
    keywords: [
      "Keyword",
      "Anxiety",
      "Depression",
      "GAD-7",
      "Keyword",
      "Keyword",
    ],
    description:
      "The 1958 National Child Development Study (NCDS) is a multidisciplinary national longitudinal birth cohort study following the lives of over 17,000 people born in 1958.",
    hasVariables: true,
    hasCohortsAvailable: true,
    hasFreeAccess: true,
  },
  {
    id: "2",
    title: "Avon Longitudinal Study of Parents and Children",
    keywords: ["Study", "Anxiety", "Depression", "GAD-7"],
    description:
      "Abstract Summary Description line text lorem ipsum dolor sit amet, consectetur salkdjadlkajs lasdkj aslkjasdlksajd lasdkjlsasdkj slakdj slakdj...",
    hasVariables: true,
    hasCohortsAvailable: true,
    hasFreeAccess: true,
  },
  {
    id: "3",
    title: "Next Steps",
    keywords: [
      "Keyword",
      "Anxiety",
      "Depression",
      "GAD-7",
      "Keyword",
      "Keyword",
    ],
    description:
      "Next Steps, previously known as the Longitudinal Study of Young People in England (LSYPE), follows the lives of around 16,000 people in England born...",
    hasVariables: false,
    hasCohortsAvailable: true,
    hasFreeAccess: true,
  },
];

const sampleStudyDetail = {
  title: "1958 National Child Development Study (NCDS)",
  description:
    "The 1958 National Child Development Study (NCDS) is a multidisciplinary national longitudinal birth cohort study following the lives of over 17,000 people born in 1958. The study aims to improve understanding of the factors affecting human development over the whole lifespan. Follows histories of health, wealth, education, family and employment from early life with linked biomedical and examination performance data integrated into the study.",
  dataOwner: {
    name: "Centre for Longitudinal Studies",
    logo: "/logos/cls.png",
  },
  geographicCoverage: "England, Scotland, Wales",
  startDate: "1958",
  sampleSizeAtRecruitment: "17,000+",
  sampleSizeAtMostRecentSweep: "9,337",
  ageAtRecruitment: "Birth",
  topics: [
    "Depression",
    "Anxiety",
    "Obesity",
    "ADHD",
    "Smoking",
    "Autism",
    "Poverty",
    "Nutrition",
    "Benefits",
    "Dyslexia",
    "Speech",
    "Literacy",
    "Behaviour",
  ],
  instruments: [
    "GAD-7",
    "Rutter Parent",
    "BSAG",
    "Rutter Teacher",
    "Malaise Inventory",
    "CAGE",
    "GHQ-12",
  ],
  dataAccess: {
    service: "UK Data Service",
    logo: "/logos/ukds.png",
  },
  itemLevelMetadata: [
    {
      name: "Catalogue for Mental Health Measures",
      logo: "/logos/cmhm.png",
    },
    {
      name: "Closer",
      logo: "/logos/closer.png",
    },
    {
      name: "UK LLC",
      logo: "/logos/uk-llc.png",
    },
  ],
};

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results] = useState(sampleResults);

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="xl">
        {/* Search Section */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            mb: 4,
          }}
        >
          <TextField
            fullWidth
            placeholder="What are you searching for?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              endAdornment: (
                <Box sx={{ mr: 1, ml: -0.5 }}>
                  <Image
                    src="/icons/discover.svg"
                    alt="Search"
                    width={20}
                    height={20}
                  />
                </Box>
              ),
              sx: {
                height: 48,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 24,
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "grey.200",
                },
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 24,
              },
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              sx={{
                minWidth: 0,
                width: 40,
                height: 40,
                borderRadius: "50%",
                p: 0,
              }}
            >
              <ChevronDown
                size={14}
                style={{
                  fill: "#004735",
                  stroke: "none",
                }}
              />
            </Button>
            <Typography
              sx={{
                color: "#191B22",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Advanced Search
            </Typography>
          </Box>
        </Box>

        {/* Filter Panel */}
        <FilterPanel />

        {/* Main Content Area */}
        <Box sx={{ display: "flex", gap: 4 }}>
          {/* Search Results Panel */}
          <Box
            sx={{
              width: "50%",
              minWidth: 0, // Allows the box to shrink below its content size
            }}
          >
            <SearchResults results={results} />
          </Box>

          {/* Study Detail Panel */}
          <Box
            sx={{
              width: "50%",
              bgcolor: "background.paper",
              borderLeft: "1px solid",
              borderColor: "grey.200",
              height: "calc(100vh - 200px)",
              position: "sticky",
              top: 24,
            }}
          >
            <StudyDetail study={sampleStudyDetail} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
