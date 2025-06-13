"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
} from "@mui/material";
import WordCloud from "react-wordcloud";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  fetchAggregateData,
  fetchNumericValues,
  fetchWordCloud,
  fetchAggregateFilters,
  AggregateResponse,
  NumericValuesResponse,
  WordCloudResponse,
  AggregateFilter,
} from "@/services/api";
import FilterPanel from "@/components/FilterPanel";

// Word cloud options
const wordCloudOptions = {
  rotations: 2,
  rotationAngles: [-90, 0] as [number, number],
  fontSizes: [12, 60] as [number, number],
  padding: 1,
} as const;

interface Bucket {
  key: string;
  doc_count: number;
}

interface AggregationData {
  buckets?: Bucket[];
  statistics?: {
    minimum?: number;
    maximum?: number;
    mean?: number;
    median?: number;
    mode?: number;
  };
}

interface AggregateData {
  [key: string]: AggregationData;
}

interface NumericDataPoint {
  values: number[];
  frequencies: number[];
}

export default function ExplorePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aggregateData, setAggregateData] = useState<AggregateResponse | null>(
    null
  );
  const [numericData, setNumericData] = useState<NumericValuesResponse | null>(
    null
  );
  const [wordCloudData, setWordCloudData] = useState<
    Array<{ text: string; value: number }>
  >([]);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [filterOptions, setFilterOptions] = useState<AggregateFilter[]>([]);

  // Fetch filter options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const filters = await fetchAggregateFilters();
        setFilterOptions(filters);
      } catch (err) {
        console.error("Error fetching filters:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch filters"
        );
      }
    };
    fetchFilters();
  }, []);

  // Transform word cloud data from API format to react-wordcloud format
  const transformWordCloudData = (data: Record<string, number>) => {
    console.log("Raw word cloud data:", data);
    const transformed = Object.entries(data).map(([text, value]) => ({
      text,
      value: value * 100, // Scale up values for better visualization
    }));
    console.log("Transformed word cloud data:", transformed);
    return transformed;
  };

  // Transform numeric data for the histogram
  const transformNumericData = (data: NumericValuesResponse) => {
    if (!data || Object.keys(data).length === 0) return [];
    const firstKey = Object.keys(data)[0];
    const numericData = data[firstKey];
    if (!numericData || !numericData.values || !numericData.frequencies)
      return [];
    return numericData.values.map((value: number, index: number) => ({
      value,
      frequency: numericData.frequencies[index],
    }));
  };

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [aggregateData, numericData, wordCloudResponse] =
          await Promise.all([
            fetchAggregateData(filters),
            fetchNumericValues(filters),
            fetchWordCloud(filters),
          ]);
        console.log("Word cloud API response:", wordCloudResponse);
        console.log("Numeric data API response:", numericData);
        console.log("Numeric data keys:", Object.keys(numericData));

        // Validate numeric data
        const validatedNumericData: NumericValuesResponse = {};
        Object.entries(numericData).forEach(([key, data]) => {
          if (data?.values?.length && data?.frequencies?.length) {
            validatedNumericData[key] = {
              values: data.values,
              frequencies: data.frequencies,
            };
          } else {
            console.warn(`Skipping invalid numeric data for ${key}:`, data);
          }
        });
        console.log("Validated numeric data:", validatedNumericData);

        setAggregateData(aggregateData);
        setNumericData(validatedNumericData);
        setWordCloudData(
          transformWordCloudData(wordCloudResponse.aggregations)
        );
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key: string, values: string[]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: values,
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Filter Panel */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <FilterPanel
          filtersData={filterOptions}
          onSelectionChange={handleFilterChange}
          selectedFilters={filters}
        />
      </Paper>

      {/* Visualizations */}
      <Grid container spacing={4}>
        {/* Word Cloud */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Topic Distribution
            </Typography>
            <Box sx={{ height: 300 }}>
              {wordCloudData.length > 0 && (
                <>
                  {(() => {
                    console.log(
                      "Rendering word cloud with data:",
                      wordCloudData
                    );
                    return null;
                  })()}
                  <Box
                    sx={{ width: "100%", height: "100%", position: "relative" }}
                  >
                    <WordCloud
                      words={wordCloudData}
                      options={wordCloudOptions}
                      minSize={[300, 300] as [number, number]}
                    />
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Numeric Values Histograms */}
        {numericData &&
          Object.entries(numericData).map(([key, data]) => {
            console.log(`Rendering histogram for ${key}:`, data);
            if (!data?.values?.length || !data?.frequencies?.length) {
              console.log(`Skipping ${key} - missing data`);
              return null;
            }
            return (
              <Grid item xs={12} md={6} key={key}>
                <Paper sx={{ p: 3, height: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    {key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
                    Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.values.map((value, index) => ({
                          value,
                          frequency: data.frequencies[index],
                        }))}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="value" />
                        <YAxis dataKey="frequency" />
                        <Tooltip />
                        <Bar dataKey="frequency" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
      </Grid>
    </Container>
  );
}
