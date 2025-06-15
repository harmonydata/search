"use client";

import { useState, useEffect, useCallback } from "react";
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
import { useDebounce } from "@/lib/hooks/useDebounce";

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
  values: (number | string)[];
  frequencies: number[];
  labels: string[];
  formatXAxis?: (value: number | string) => string;
}

interface ProcessedNumericData {
  [key: string]: NumericDataPoint;
}

const dateKeys = ["start_year", "end_year", "sample_size"];

// Function to calculate frequency counts from raw data
const calculateFrequencyCounts = (
  rawValues: number[],
  fieldName: string
): { values: (number | string)[]; frequencies: number[]; labels: string[] } => {
  // For non-date fields, add 0 to rawValues if not present
  const isSampleSize = fieldName === "sample_size";
  let processedValues = [...rawValues];

  // Filter out invalid values (null, undefined, NaN)
  const validValues = processedValues.filter(
    (value) => value !== null && value !== undefined && !isNaN(value)
  );

  if (validValues.length === 0) {
    return { values: [], frequencies: [], labels: [] };
  }

  // Logarithmic binning for sample_size
  if (isSampleSize) {
    const binEdges = [1000, 10000, 100000, 1000000, 10000000];
    const binLabels = ["<1k", "<10k", "<100k", "<1m", "<10m"];
    const bins = new Array(binLabels.length).fill(0);
    validValues.forEach((value) => {
      for (let i = 0; i < binEdges.length; i++) {
        if (value > (i == 0 ? 0 : binEdges[i - 1]) && value <= binEdges[i]) {
          bins[i]++;
          break;
        }
      }
    });
    return { values: binEdges, frequencies: bins, labels: binLabels };
  }

  // Find min and max for binning
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);

  let values: (number | string)[] = [];
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

  return { values, frequencies, labels: [] };
};

// Function to format x-axis values based on field type
const formatXAxisValue = (
  value: number | string,
  fieldName: string
): string => {
  if (typeof value === "string") return value;
  if (fieldName.includes("year")) {
    return value.toString();
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

// Transform word cloud data from API format to react-wordcloud format
const transformWordCloudData = (data: Record<string, number>) => {
  return Object.entries(data).map(([text, value]) => ({
    text,
    value: value * 100, // Scale up values for better visualization
  }));
};

// Separate component for data fetching and visualization
const DataVisualization = ({
  filters,
}: {
  filters: Record<string, string[]>;
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aggregateData, setAggregateData] = useState<AggregateResponse | null>(
    null
  );
  const [numericData, setNumericData] = useState<ProcessedNumericData>({});
  const [wordCloudData, setWordCloudData] = useState<
    Array<{ text: string; value: number }>
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch aggregate and numeric data first
        const [aggregateData, numericData] = await Promise.all([
          fetchAggregateData(filters),
          fetchNumericValues(filters),
        ]);

        // Process numeric data to calculate frequency counts
        const processedNumericData: ProcessedNumericData = {};
        if (numericData.aggregations) {
          Object.entries(numericData.aggregations).forEach(([key, values]) => {
            if (Array.isArray(values)) {
              const {
                values: uniqueValues,
                frequencies,
                labels,
              } = calculateFrequencyCounts(values, key);
              processedNumericData[key] = {
                values: uniqueValues,
                frequencies,
                labels,
                formatXAxis: (value: number | string) =>
                  formatXAxisValue(value, key),
              };
            }
          });
        }

        setAggregateData(aggregateData);
        setNumericData(processedNumericData);

        // Try to fetch word cloud data separately
        try {
          const wordCloudResponse = await fetchWordCloud(filters);
          setWordCloudData(
            transformWordCloudData(wordCloudResponse.aggregations)
          );
        } catch (wordCloudError) {
          console.warn("Word cloud data fetch failed:", wordCloudError);
          setWordCloudData([]); // Set empty array to indicate no word cloud data
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

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
    <Grid container spacing={4} sx={{ width: "100%", margin: 0 }}>
      {/* Word Cloud - only show if we have data */}
      {wordCloudData.length > 0 && (
        <Grid item xs={12} sx={{ width: "100%" }}>
          <Typography variant="h6" gutterBottom>
            Word Cloud
          </Typography>
          <Box sx={{ height: 300, width: "100%" }}>
            <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
              <WordCloud
                words={wordCloudData}
                options={wordCloudOptions}
                minSize={[300, 300] as [number, number]}
              />
            </Box>
          </Box>
        </Grid>
      )}

      {/* Numeric Values Histograms */}
      <Grid item xs={12} sx={{ width: "100%" }}>
        {numericData && Object.entries(numericData).length > 0 && (
          <Grid container spacing={3} sx={{ width: "100%", margin: 0 }}>
            {Object.entries(numericData)
              .filter(([key, data]) => data.values.length > 0)
              .map(([key, data]) => {
                let chartData = data.values.map((value, i) => ({
                  value,
                  frequency: data.frequencies[i],
                  name:
                    data.labels && data.labels.length
                      ? data.labels[i]
                      : data.formatXAxis
                      ? data.formatXAxis(value)
                      : value.toString(),
                }));
                console.log("Chart data for ", key, ":", chartData);

                return (
                  <Grid item xs={12} md={6} key={key}>
                    <Paper sx={{ p: 3, width: "100%" }}>
                      <Typography variant="h6" gutterBottom>
                        {key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
                        Distribution (
                        {chartData.reduce(
                          (acc, curr) => acc + curr.frequency,
                          0
                        )}{" "}
                        datasets)
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
                              dataKey="value"
                              tick={{ fontSize: 12 }}
                              interval="preserveStartEnd"
                              type="number"
                              domain={[
                                chartData[0].value as number,
                                chartData[chartData.length - 1].value as number,
                              ]}
                              allowDecimals={false}
                              scale={key !== "sample_size" ? "linear" : "log"}
                              tickFormatter={(value) => {
                                const dataPoint = chartData.find(
                                  (d) => d.value === value
                                );
                                return dataPoint
                                  ? dataPoint.name
                                  : value.toString();
                              }}
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
        )}
      </Grid>
    </Grid>
  );
};

export default function ExplorePage() {
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [filterOptions, setFilterOptions] = useState<AggregateFilter[]>([]);
  const debouncedFilters = useDebounce(filters, 500); // 500ms debounce

  // Fetch filter options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const filters = await fetchAggregateFilters();
        setFilterOptions(filters);
      } catch (err) {
        console.error("Error fetching filters:", err);
      }
    };
    fetchFilters();
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, values: string[]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: values,
    }));
  }, []);

  return (
    <Container
      maxWidth={false}
      sx={{ mt: 4, width: "100%", px: { xs: 0, sm: 2 } }}
    >
      {/* Filter Panel */}
      <Box sx={{ mb: 4 }}>
        <FilterPanel
          filtersData={filterOptions}
          onSelectionChange={handleFilterChange}
          selectedFilters={filters}
        />
      </Box>

      {/* Data Visualization */}
      <DataVisualization filters={debouncedFilters} />
    </Container>
  );
}
