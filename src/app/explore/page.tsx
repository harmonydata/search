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
  Card,
  CardContent,
  Tooltip as MuiTooltip,
} from "@mui/material";
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
  Treemap,
  Cell,
} from "recharts";
import {
  fetchAggregateData,
  fetchNumericValues,
  fetchWordCloud,
  fetchAggregateFilters,
  fetchSources,
  AggregateResponse,
  NumericValuesResponse,
  WordCloudResponse,
  AggregateFilter,
  SourcesResponse,
} from "@/services/api";
import FilterPanel from "@/components/FilterPanel";
import SquareChip from "@/components/SquareChip";
import OrganizationCard from "@/components/OrganizationCard";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { getAssetPrefix } from "@/lib/utils/shared";

// Define the props for the Treemap content component
type TreemapContentProps = {
  root: { children: { name: string }[] };
  depth?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index: number;
  payload?: any;
  [key: string]: any;
};

// Treemap content component
const TreemapContent = (props: TreemapContentProps) => {
  const { root, depth, x, y, width, height, index, payload, ...rest } = props;
  const color = TREEMAP_COLORS[index! % TREEMAP_COLORS.length];
  const name = root.children[index].name || "Unknown";

  return (
    <CustomizedContent
      root={root}
      depth={depth}
      x={x}
      y={y}
      width={width}
      height={height}
      index={index}
      name={name}
      color={color}
    />
  );
};

// Treemap color palette
const TREEMAP_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#d084d0",
  "#87d068",
  "#ffb347",
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#feca57",
  "#ff9ff3",
  "#54a0ff",
];

// Custom treemap content component with text wrapping
const CustomizedContent = (props: any) => {
  const { root, depth, x, y, width, height, index, name, color } = props;

  // Don't render text in the smallest rectangles
  if (width < 30 || height < 20) {
    return null;
  }

  // A simple algorithm to break the text into lines
  const words = name.split(" ");
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    // This is a rough estimation. For perfect accuracy, you'd need to
    // measure the text width in the DOM, but that's much more complex.
    // We estimate character width to be around 6-8px for a 12px font.
    const estimatedWidth = (currentLine.length + word.length + 1) * 7;

    if (estimatedWidth < width - 10) {
      // 10px padding
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  const fontSize = 11;
  const lineHeight = 1.1; // 1.1em
  const totalTextHeight = lines.length * fontSize * lineHeight;

  // Only render if the text block fits vertically
  if (totalTextHeight > height - 10) {
    return null;
  }

  // Calculate the starting y position to vertically center the text block
  const startY = y + (height - totalTextHeight) / 2 + fontSize;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: "#fff",
          strokeWidth: 2 / (depth + 1e-10),
          cursor: "pointer",
        }}
        onClick={() => {
          const searchUrl = `${getAssetPrefix()}?query=${encodeURIComponent(
            name
          )}`;
          window.open(searchUrl, "_blank");
        }}
      />
      <text
        x={x + width / 2} // Center horizontally
        y={startY}
        textAnchor="middle"
        fill="#000"
        fontSize={fontSize}
        strokeWidth="0"
        style={{
          pointerEvents: "none",
          fontWeight: "normal",
        }} // Prevent text from blocking mouse events
      >
        {lines.map((line, i) => (
          <tspan key={i} x={x + width / 2} dy={i === 0 ? 0 : `${lineHeight}em`}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

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

// Transform word cloud data from API format to treemap format
const transformTreemapData = (data: Record<string, number>) => {
  return Object.entries(data)
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 1000), // Scale up and round to integers for better treemap visualization
    }))
    .filter((item) => item.value > 0) // Filter out zero values
    .sort((a, b) => b.value - a.value) // Sort by value descending
    .slice(0, 50); // Limit to top 50 items for better performance
};

// Summary Card Component
const SummaryCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon?: React.ReactNode;
}) => (
  <Card elevation={1} sx={{ height: "100%" }}>
    <CardContent sx={{ p: 3, textAlign: "center" }}>
      {icon && (
        <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
          {icon}
        </Box>
      )}
      <Typography
        variant="h3"
        component="div"
        sx={{ mb: 1, fontWeight: "bold", color: "primary.main" }}
      >
        {value.toLocaleString()}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
    </CardContent>
  </Card>
);

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
  const [treemapData, setTreemapData] = useState<
    Array<{ name: string; value: number }>
  >([]);
  const [sourcesData, setSourcesData] = useState<SourcesResponse | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch aggregate, numeric, and sources data
        const [aggregateData, numericData, sourcesData] = await Promise.all([
          fetchAggregateData(filters),
          fetchNumericValues(filters),
          fetchSources(),
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
        setSourcesData(sourcesData);

        // Try to fetch word cloud data separately for treemap
        try {
          const wordCloudResponse = await fetchWordCloud(filters);
          setTreemapData(transformTreemapData(wordCloudResponse.aggregations));
        } catch (wordCloudError) {
          console.warn("Word cloud data fetch failed:", wordCloudError);
          setTreemapData([]); // Set empty array to indicate no treemap data
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

  // Calculate summary statistics from aggregate data
  const aggregations = (aggregateData as any)?.aggregations || {};

  // Count studies + datasets from resource_type
  const resourceTypeData = aggregations.resource_type || {};
  const studiesDatasets =
    (resourceTypeData.study || 0) + (resourceTypeData.dataset || 0);

  // Count unique data sources
  const sourceData = aggregations.source || {};
  const totalDataSources = Object.keys(sourceData).length;

  // Count unique topics/keywords
  const keywordsData = aggregations.keywords || {};
  const totalTopics = Object.keys(keywordsData).length;

  // Count total variables from resource_type
  const totalVariables = resourceTypeData.variable || 0;

  // Get top keywords for Popular Topics section
  const topKeywords = Object.entries(keywordsData)
    .map(([key, value]) => ({ key, doc_count: value as number }))
    .sort((a, b) => b.doc_count - a.doc_count)
    .slice(0, 20);

  // Get top data sources for Popular Data Sources section - use rich source info
  const topDataSources = Object.entries(sourceData)
    .map(([key, value]) => ({
      key,
      doc_count: value as number,
      sourceInfo: sourcesData?.[key] || null,
    }))
    .sort((a, b) => b.doc_count - a.doc_count)
    .slice(0, 4);

  // Get top instruments for Popular Instruments section
  const instrumentsData = aggregations.instruments || {};
  const topInstruments = Object.entries(instrumentsData)
    .map(([key, value]) => ({ key, doc_count: value as number }))
    .sort((a, b) => b.doc_count - a.doc_count)
    .slice(0, 10);

  // Get top study designs for Popular Study Designs section
  const studyDesignData = aggregations.study_design || {};
  const topStudyDesigns = Object.entries(studyDesignData)
    .map(([key, value]) => ({ key, doc_count: value as number }))
    .sort((a, b) => b.doc_count - a.doc_count)
    .slice(0, 20);

  return (
    <Box sx={{ width: "100%" }}>
      {/* Summary Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="Studies / Datasets" value={studiesDatasets} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="Data Sources" value={totalDataSources} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="Topics" value={totalTopics} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="Variables" value={totalVariables} />
        </Grid>
      </Grid>

      {/* Popular Phrases (Treemap) */}
      {treemapData.length > 0 && (
        <Card elevation={1} sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Popular Phrases
            </Typography>
            <Box sx={{ height: 400, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="value"
                  nameKey="name"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  content={TreemapContent as any}
                >
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <Box
                            sx={{
                              bgcolor: "background.paper",
                              p: 2,
                              borderRadius: 1,
                              boxShadow: 2,
                              border: 1,
                              borderColor: "divider",
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold" }}
                            >
                              {data.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Frequency: {(data.value / 1000).toFixed(3)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Click to search
                            </Typography>
                          </Box>
                        );
                      }
                      return null;
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Popular Topics and Data Sources - side by side */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Popular Topics */}
        {topKeywords.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card elevation={1} sx={{ height: "100%" }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Popular Topics
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {topKeywords.map((keyword, index) => (
                    <MuiTooltip
                      key={`keyword-tooltip-${index}`}
                      title={`Click to search for \"${keyword.key}\"`}
                    >
                      <span>
                        <SquareChip
                          sx={{ cursor: "pointer" }}
                          onClick={() => {
                            const url = `${getAssetPrefix()}?topics=${encodeURIComponent(
                              keyword.key
                            )}`;
                            window.open(url, "_blank");
                          }}
                        >
                          {keyword.key}
                        </SquareChip>
                      </span>
                    </MuiTooltip>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Popular Data Sources */}
        {topDataSources.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card elevation={1} sx={{ height: "100%" }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Popular Data Sources
                </Typography>
                <Grid container spacing={2}>
                  {topDataSources.map((source, index) => (
                    <Grid item xs={12} sm={6} key={`source-${index}`}>
                      <OrganizationCard
                        name={source.sourceInfo?.name || source.key}
                        url={source.sourceInfo?.url}
                        logo={source.sourceInfo?.logo}
                        compact={false}
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Popular Instruments and Study Designs - side by side */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Popular Instruments */}
        {topInstruments.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card elevation={1} sx={{ height: "100%" }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Popular Instruments
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {topInstruments.map((instrument, index) => (
                    <MuiTooltip
                      key={`instrument-tooltip-${index}`}
                      title={`Click to search for \"${instrument.key}\"`}
                    >
                      <span>
                        <SquareChip
                          sx={{ cursor: "pointer" }}
                          onClick={() => {
                            const url = `${getAssetPrefix()}?instruments=${encodeURIComponent(
                              instrument.key
                            )}`;
                            window.open(url, "_blank");
                          }}
                        >
                          {instrument.key}
                        </SquareChip>
                      </span>
                    </MuiTooltip>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Popular Study Designs */}
        {topStudyDesigns.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card elevation={1} sx={{ height: "100%" }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Popular Study Designs
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {topStudyDesigns.map((design, index) => (
                    <MuiTooltip
                      key={`design-tooltip-${index}`}
                      title={`Click to search for \"${design.key}\"`}
                    >
                      <span>
                        <SquareChip
                          sx={{ cursor: "pointer" }}
                          onClick={() => {
                            const url = `${getAssetPrefix()}?study_design=${encodeURIComponent(
                              design.key
                            )}`;
                            window.open(url, "_blank");
                          }}
                        >
                          {design.key}
                        </SquareChip>
                      </span>
                    </MuiTooltip>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Distribution Analysis */}
      {numericData && Object.entries(numericData).length > 0 && (
        <>
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{ mb: 3, fontWeight: "bold" }}
          >
            Distribution Analysis
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
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
        </>
      )}
    </Box>
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

      {/* Meta Data Explorer Title */}
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ mb: 4, fontWeight: "bold" }}
      >
        Meta Data Explorer
      </Typography>

      {/* Data Visualization */}
      <DataVisualization filters={debouncedFilters} />
    </Container>
  );
}
