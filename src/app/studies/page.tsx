"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Paper,
} from "@mui/material";
import { fetchSearchResults, SearchResult } from "@/services/api";
import StudyCard from "@/components/StudyCard";
import { getAssetPrefix } from "@/lib/utils/shared";
import Image from "next/image";

export default function StudiesPage() {
  const [studies, setStudies] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  // Filter studies based on search term
  const filteredStudies = studies.filter((study) => {
    const title = study.dataset_schema?.name || "";
    const description = study.dataset_schema?.description || "";
    const searchLower = searchTerm.toLowerCase();

    return (
      title.toLowerCase().includes(searchLower) ||
      description.toLowerCase().includes(searchLower)
    );
  });

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

      {/* Search Bar */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search studies by title or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Image
                  src={getAssetPrefix() + "icons/discover.svg"}
                  alt="Search"
                  width={20}
                  height={20}
                />
              </InputAdornment>
            ),
            sx: {
              height: 48,
              "& .MuiOutlinedInput-root": { borderRadius: 24 },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "grey.200",
              },
            },
          }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 24 } }}
        />
      </Box>

      {/* Results count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {searchTerm
          ? `Showing ${filteredStudies.length} of ${studies.length} studies`
          : `${studies.length} studies available`}
      </Typography>

      <Grid container spacing={3}>
        {filteredStudies.map((study) => (
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

      {filteredStudies.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            {searchTerm
              ? "No studies match your search criteria"
              : "No studies found"}
          </Typography>
          {searchTerm && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Try adjusting your search terms
            </Typography>
          )}
        </Box>
      )}
    </Container>
  );
}
