"use client";

import { useState, useEffect } from "react";
import { Box, Container, Typography, Grid } from "@mui/material";
import { fetchSearchResults, SearchResult } from "@/services/api";
import StudyCard from "@/components/StudyCard";

export default function StudiesPage() {
  const [studies, setStudies] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudies() {
      try {
        setLoading(true);
        const response = await fetchSearchResults(
          "*", // Use wildcard to get all results
          { resource_type: ["study"] }, // Filter for studies only
          1, // First page
          100, // Get more results per page
          false // Use new search endpoint
        );
        setStudies(response.results || []);
      } catch (err) {
        console.error("Failed to load studies:", err);
        setError("Failed to load studies");
      } finally {
        setLoading(false);
      }
    }

    loadStudies();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          All Studies
        </Typography>
        <Typography>Loading studies...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          All Studies
        </Typography>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        All Studies
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Browse through all available studies in our database
      </Typography>

      <Grid container spacing={3}>
        {studies.map((study) => (
          <Grid
            item
            xs={12}
            sm={6}
            lg={4}
            xl={3}
            key={study.extra_data?.uuid || study.dataset_schema?.name}
          >
            <StudyCard study={study} />
          </Grid>
        ))}
      </Grid>

      {studies.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No studies found
          </Typography>
        </Box>
      )}
    </Container>
  );
}
