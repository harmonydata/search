"use client";

import { Box, Typography, Chip, Card, Button } from "@mui/material";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import SquareChip from "@/components/SquareChip";

interface StudyDetailProps {
  study: {
    title: string;
    description: string;
    dataOwner: {
      name: string;
      logo: string;
    };
    geographicCoverage: string;
    startDate: string;
    sampleSizeAtRecruitment: string;
    sampleSizeAtMostRecentSweep: string;
    ageAtRecruitment: string;
    topics: string[];
    instruments: string[];
    dataAccess: {
      service: string;
      logo: string;
    };
    itemLevelMetadata: Array<{
      name: string;
      logo: string;
    }>;
  };
}

export default function StudyDetail({ study }: StudyDetailProps) {
  return (
    <Box sx={{ height: "100%", overflow: "auto", p: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight={500}>
        {study.title}
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {study.description}
      </Typography>

      <Typography variant="subtitle2" gutterBottom>
        Data Owner:
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", mb: 4, gap: 2 }}>
        <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography>{study.dataOwner.name}</Typography>
        </Box>
        <Image
          src={study.dataOwner.logo}
          alt={study.dataOwner.name}
          width={80}
          height={40}
          style={{ objectFit: "contain" }}
        />
      </Box>

      <Box sx={{ display: "grid", gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Geographic Coverage:
          </Typography>
          <Typography>{study.geographicCoverage}</Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Start Date:
          </Typography>
          <Typography>{study.startDate}</Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Sample size at recruitment:
          </Typography>
          <Typography>{study.sampleSizeAtRecruitment}</Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Sample size at most recent sweep:
          </Typography>
          <Typography>{study.sampleSizeAtMostRecentSweep}</Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Age at Recruitment:
          </Typography>
          <Typography>{study.ageAtRecruitment}</Typography>
        </Box>
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        Topics found within study:
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 4 }}>
        {study.topics.map((topic) => (
          <SquareChip key={topic} chipVariant="secondary">
            {topic}
          </SquareChip>
        ))}
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        List of standardised instruments used within study:
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 4 }}>
        {study.instruments.map((instrument) => (
          <SquareChip key={instrument} chipVariant="primary">
            {instrument}
          </SquareChip>
        ))}
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        Data Access:
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", mb: 4, gap: 2 }}>
        <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography>{study.dataAccess.service}</Typography>
        </Box>
        <Image
          src={study.dataAccess.logo}
          alt={study.dataAccess.service}
          width={80}
          height={40}
          style={{ objectFit: "contain" }}
        />
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        Item Level Metadata
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
        {study.itemLevelMetadata.map((item) => (
          <Card
            key={item.name}
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "grey.200",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography>{item.name}</Typography>
            <Image
              src={item.logo}
              alt={item.name}
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
          </Card>
        ))}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <SquareChip
          fullWidth
          chipVariant="secondary"
          endIcon={
            <ChevronDown
              size={16}
              style={{ fill: "#004735", stroke: "none" }}
            />
          }
          sx={{ justifyContent: "space-between", py: 2, height: "auto" }}
        >
          AI Summary
        </SquareChip>
        <SquareChip
          fullWidth
          chipVariant="secondary"
          endIcon={
            <ChevronDown
              size={16}
              style={{ fill: "#004735", stroke: "none" }}
            />
          }
          sx={{ justifyContent: "space-between", py: 2, height: "auto" }}
        >
          Related Variables found within study
        </SquareChip>
      </Box>
    </Box>
  );
}
