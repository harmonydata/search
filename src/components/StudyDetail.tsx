"use client";

import { Box, Typography, Card } from "@mui/material";
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
  // Filter out malformed keywords/topics that contain HTML fragments
  const filteredTopics = study.topics.filter(
    (topic: any) => typeof topic === 'string' && !topic.includes('<a title=') && !topic.startsWith('<')
  );

  return (
    <Box sx={{ 
      p: 3,
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          mb: 4,
        }}
      >
        <Typography variant="h4" gutterBottom>
          {study.title}
        </Typography>
        <Typography variant="body1">{study.description}</Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          mb: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle2">Data Owner:</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography>{study.dataOwner.name}</Typography>
            <Image
              src={study.dataOwner.logo}
              alt={study.dataOwner.name}
              width={80}
              height={40}
              style={{ objectFit: "contain" }}
              unoptimized={true}
            />
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle2">Geographic Coverage:</Typography>
          <Typography>{study.geographicCoverage}</Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle2">Study Start Date:</Typography>
          <Typography>{study.startDate}</Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle2">Sample Size at Recruitment:</Typography>
          <Typography>{study.sampleSizeAtRecruitment}</Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle2">Sample Size at Last Sweep:</Typography>
          <Typography>{study.sampleSizeAtMostRecentSweep}</Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle2">Age at recruitment:</Typography>
          <Typography>{study.ageAtRecruitment}</Typography>
        </Box>
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        Topics found within study:
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 4 }}>
        {filteredTopics.map((topic) => (
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
          unoptimized={true}
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
              unoptimized={true}
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
