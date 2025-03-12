"use client";

import { Card, CardContent, Typography, Box } from "@mui/material";

export interface ResourceData {
  all_text: string;
  age_lower: number;
  age_upper: number;
  country_codes: string[];
  country: string;
  data_access: string;
  description: string;
  doi: string;
  duration_years: number;
  end_year: number;
  funders: string;
  genetic_data_collected: boolean;
  geographic_coverage: string;
  id: string;
  institution: string;
  instruments: string[];
  language_codes: string[];
  num_variables: number;
  num_sweeps: number;
  original_source_url: string;
  owner: string;
  question: string;
  response_options: string[];
  resource_type: string;
  sample_size: number;
  sex: string;
  source: string;
  start_year: number;
  study_design: string[];
  title: string;
  topics: string[];
  url: string;
  study_variable_relationship: any;
  score: number;
}

interface ResourceCardProps {
  resource: ResourceData;
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <Card sx={{ marginBottom: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {resource.title}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {resource.description}
        </Typography>
        <Box
          sx={{
            mt: 2,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1,
          }}
        >
          <Typography variant="body2">
            <strong>ID:</strong> {resource.id}
          </Typography>
          <Typography variant="body2">
            <strong>Resource Type:</strong> {resource.resource_type}
          </Typography>
          <Typography variant="body2">
            <strong>Score:</strong> {resource.score}
          </Typography>
          <Typography variant="body2">
            <strong>DOI:</strong> {resource.doi}
          </Typography>
          <Typography variant="body2">
            <strong>Sample Size:</strong> {resource.sample_size}
          </Typography>
          <Typography variant="body2">
            <strong>Age Lower:</strong> {resource.age_lower}
          </Typography>
          <Typography variant="body2">
            <strong>Age Upper:</strong> {resource.age_upper}
          </Typography>
          <Typography variant="body2">
            <strong>Start Year:</strong> {resource.start_year}
          </Typography>
          <Typography variant="body2">
            <strong>End Year:</strong> {resource.end_year}
          </Typography>
          <Typography variant="body2">
            <strong>Duration (years):</strong> {resource.duration_years}
          </Typography>
          <Typography variant="body2">
            <strong>Country:</strong> {resource.country}
          </Typography>
          <Typography variant="body2">
            <strong>Country Codes:</strong> {resource.country_codes.join(", ")}
          </Typography>
          <Typography variant="body2">
            <strong>Language Codes:</strong>{" "}
            {resource.language_codes.join(", ")}
          </Typography>
          <Typography variant="body2">
            <strong>Geographic Coverage:</strong> {resource.geographic_coverage}
          </Typography>
          <Typography variant="body2">
            <strong>Data Access:</strong> {resource.data_access}
          </Typography>
          <Typography variant="body2">
            <strong>Funders:</strong> {resource.funders}
          </Typography>
          <Typography variant="body2">
            <strong>Institution:</strong> {resource.institution}
          </Typography>
          <Typography variant="body2">
            <strong>Owner:</strong> {resource.owner}
          </Typography>
          <Typography variant="body2">
            <strong>Source:</strong> {resource.source}
          </Typography>
          <Typography variant="body2">
            <strong>Original Source URL:</strong> {resource.original_source_url}
          </Typography>
          <Typography variant="body2">
            <strong>Instruments:</strong> {resource.instruments.join(", ")}
          </Typography>
          <Typography variant="body2">
            <strong>Topics:</strong> {resource.topics.join(", ")}
          </Typography>
          <Typography variant="body2">
            <strong>Study Design:</strong> {resource.study_design.join(", ")}
          </Typography>
          <Typography variant="body2">
            <strong>Response Options:</strong>{" "}
            {resource.response_options.join(", ")}
          </Typography>
          <Typography variant="body2">
            <strong>Question:</strong> {resource.question}
          </Typography>
          <Typography variant="body2">
            <strong>All Text:</strong> {resource.all_text}
          </Typography>
          <Typography variant="body2">
            <strong>Num Variables:</strong> {resource.num_variables}
          </Typography>
          <Typography variant="body2">
            <strong>Num Sweeps:</strong> {resource.num_sweeps}
          </Typography>
          <Typography variant="body2">
            <strong>Sex:</strong> {resource.sex}
          </Typography>
          <Typography variant="body2">
            <strong>Genetic Data Collected:</strong>{" "}
            {resource.genetic_data_collected.toString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
