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
  LineChart,
  Line,
  Area,
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
  formatXAxis?: (value: number) => string;
}

interface ProcessedNumericData {
  [key: string]: NumericDataPoint;
}

const dateKeys = ["start_year", "end_year", "sample_size"];

// Function to calculate frequency counts from raw data
const calculateFrequencyCounts = (
  rawValues: number[],
  fieldName: string
): { values: number[]; frequencies: number[] } => {
  // For non-date fields, add 0 to rawValues if not present
  const isDateField = dateKeys.includes(fieldName);
  let processedValues = [...rawValues];

  // Filter out invalid values (null, undefined, NaN)
  const validValues = processedValues.filter(
    (value) => value !== null && value !== undefined && !isNaN(value)
  );

  if (validValues.length === 0) {
    return { values: [], frequencies: [] };
  }

  // Find min and max for binning
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);

  let values: number[] = [];
  let frequencies: number[] = [];

  if (fieldName.includes("year")) {
    // For years, create 5-year ranges
    const startYear = Math.floor(min / 5) * 5;
    const endYear = Math.ceil(max / 5) * 5;
    const numBins = (endYear - startYear) / 5;

    // Create bins for 5-year ranges
    const bins = new Array(numBins).fill(0);
    const yearRanges = new Array(numBins)
      .fill(0)
      .map((_, i) => startYear + i * 5);

    // Count frequencies in each 5-year range
    validValues.forEach((value) => {
      const binIndex = Math.floor((value - startYear) / 5);
      if (binIndex >= 0 && binIndex < numBins) {
        bins[binIndex]++;
      }
    });

    values = yearRanges;
    frequencies = bins;
  } else {
    // For other numeric fields, use regular binning
    let numBins = 10; // default
    if (fieldName.includes("age")) {
      numBins = 6; // 6 bins for age (roughly 10-year ranges)
    } else if (fieldName.includes("sample_size")) {
      numBins = 8; // 8 bins for sample size
    } else if (fieldName.includes("duration")) {
      numBins = 5; // 5 bins for duration
    }

    // Calculate bin size
    const binSize = (max - min) / numBins;

    // Create bins
    const bins = new Array(numBins).fill(0);
    const binEdges = new Array(numBins + 1)
      .fill(0)
      .map((_, i) => min + i * binSize);

    // Count frequencies in each bin
    validValues.forEach((value) => {
      const binIndex = Math.min(
        Math.floor((value - min) / binSize),
        numBins - 1
      );
      bins[binIndex]++;
    });

    // Create bin centers for x-axis
    values = binEdges.slice(0, -1).map((edge, i) => edge + binSize / 2);
    frequencies = bins;
  }

  return { values, frequencies };
};

// Function to format x-axis values based on field type
const formatXAxisValue = (value: number, fieldName: string): string => {
  if (fieldName.includes("year")) {
    return value.toString();
  } else if (fieldName.includes("sample_size")) {
    // Round to nearest thousand for sample sizes
    return `${Math.round(value / 1000)}k`;
  } else if (fieldName.includes("num_")) {
    // Round all numeric fields to whole numbers
    return Math.round(value).toString();
  } else if (fieldName.includes("age")) {
    return Math.round(value).toString();
  } else if (fieldName.includes("duration")) {
    return Math.round(value).toString();
  }
  // For any other numeric fields, round to whole numbers
  return Math.round(value).toString();
};

export default function ExplorePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aggregateData, setAggregateData] = useState<AggregateResponse | null>(
    null
  );
  const [numericData, setNumericData] = useState<ProcessedNumericData>({});
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
        console.log("Raw numeric data from API:", numericData);

        // Process numeric data to calculate frequency counts
        const processedNumericData: ProcessedNumericData = {};
        if (numericData.aggregations) {
          Object.entries(numericData.aggregations).forEach(([key, values]) => {
            if (Array.isArray(values)) {
              // Calculate frequency counts from raw values
              const { values: uniqueValues, frequencies } =
                calculateFrequencyCounts(values, key);
              processedNumericData[key] = {
                values: uniqueValues,
                frequencies,
                formatXAxis: (value: number) => formatXAxisValue(value, key),
              };
            } else {
              console.warn(`Skipping invalid numeric data for ${key}:`, values);
            }
          });
        }
        console.log("Processed numeric data:", processedNumericData);

        setAggregateData(aggregateData);
        setNumericData(processedNumericData);
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
    <Container
      maxWidth={false}
      sx={{ mt: 4, width: "100%", px: { xs: 0, sm: 2 } }}
    >
      {/* Filter Panel - always visible */}
      <Box sx={{ mb: 4 }}>
        <FilterPanel
          filtersData={filterOptions}
          onSelectionChange={handleFilterChange}
          selectedFilters={filters}
        />
      </Box>

      {/* Visualizations */}
      <Grid container spacing={4} sx={{ width: "100%", margin: 0 }}>
        {/* Word Cloud - show spinner if loading */}
        <Grid item xs={12} sx={{ width: "100%" }}>
          <Typography variant="h6" gutterBottom>
            Word Cloud
          </Typography>
          <Box sx={{ height: 300, width: "100%" }}>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <CircularProgress />
              </Box>
            ) : wordCloudData.length > 0 ? (
              <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
                <WordCloud
                  words={wordCloudData}
                  options={wordCloudOptions}
                  minSize={[300, 300] as [number, number]}
                />
              </Box>
            ) : null}
          </Box>
        </Grid>

        {/* Numeric Values Histograms - show spinner if loading */}
        <Grid item xs={12} sx={{ width: "100%" }}>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 300,
              }}
            >
              <CircularProgress />
            </Box>
          ) : numericData && Object.entries(numericData).length > 0 ? (
            <Grid container spacing={3} sx={{ width: "100%", margin: 0 }}>
              {Object.entries(numericData).map(([key, data]) => {
                // For non-date fields, ensure 0 is included with frequency 0 if not present
                let chartData = data.values.map((value, i) => ({
                  value,
                  frequency: data.frequencies[i],
                  name: data.formatXAxis
                    ? data.formatXAxis(value)
                    : value.toString(),
                }));
                if (!dateKeys.includes(key)) {
                  const hasZero = data.values.some((v) => v === 0);
                  if (!hasZero) {
                    chartData = [
                      {
                        value: 0,
                        frequency: 0,
                        name: data.formatXAxis ? data.formatXAxis(0) : "0",
                      },
                      ...chartData,
                    ];
                  }
                }
                console.log("Chart data for ", key, ":", chartData);
                return (
                  <Grid item xs={12} md={6} key={key}>
                    <Paper sx={{ p: 3, width: "100%" }}>
                      <Typography variant="h6" gutterBottom>
                        {key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
                        Distribution
                      </Typography>
                      <Box sx={{ width: "100%", minHeight: 250 }}>
                        <ResponsiveContainer width="100%" aspect={2}>
                          <LineChart
                            data={chartData}
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 12 }}
                              interval="preserveStartEnd"
                              domain={[
                                !dateKeys.includes(key) ? 0 : "dataMin",
                                "dataMax",
                              ]}
                              type="number"
                              allowDecimals={false}
                              scale="linear"
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              label={{
                                value: "Frequency",
                                angle: -90,
                                position: "insideLeft",
                                style: { fontSize: 12 },
                              }}
                            />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="frequency"
                              stroke="#8884d8"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 8 }}
                            />
                            <Area
                              type="monotone"
                              dataKey="frequency"
                              fill="#8884d8"
                              fillOpacity={0.1}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          ) : null}
        </Grid>
      </Grid>
    </Container>
  );
}
