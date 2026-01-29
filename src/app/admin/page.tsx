"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  isAdmin,
  getSearchAnalyticsSummary,
  getDiscoveryFeedback,
  getHarmonyRatingSummary,
  getHarmonyRatings,
  getMismatches,
} from "@/lib/admin";
import type {
  SearchAnalyticsSummary,
  FeedbackItem,
  HarmonyRatingSummary,
  MismatchItem,
} from "@/lib/admin";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Button,
} from "@mui/material";
import { Download } from "lucide-react";
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type FeedbackView = "discovery" | "harmony" | "mismatches";

export default function AdminPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [analytics, setAnalytics] = useState<SearchAnalyticsSummary | null>(null);
  const [discoveryFeedback, setDiscoveryFeedback] = useState<FeedbackItem[]>([]);
  const [harmonySummary, setHarmonySummary] = useState<HarmonyRatingSummary | null>(null);
  const [harmonyRatings, setHarmonyRatings] = useState<FeedbackItem[]>([]);
  const [mismatches, setMismatches] = useState<MismatchItem[]>([]);
  const [feedbackView, setFeedbackView] = useState<FeedbackView>("discovery");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated and is admin
    if (!authLoading) {
      if (!currentUser) {
        router.push("/");
        return;
      }

      // Check admin status from Firestore
      checkAdminStatus();
    }
  }, [currentUser, authLoading, router]);

  const checkAdminStatus = async () => {
    if (!currentUser?.uid) {
      router.push("/");
      return;
    }

    try {
      const admin = await isAdmin(currentUser.uid);
      if (!admin) {
        setError("Access denied. Admin privileges required.");
        return;
      }

      // User is admin, load data
      loadData();
    } catch (error) {
      console.error("Failed to check admin status:", error);
      setError("Failed to verify admin access. Please try again.");
    }
  };

  const loadData = async () => {
    try {
      setAnalyticsLoading(true);
      setFeedbackLoading(true);

      const [analyticsData, discoveryData, harmonySummaryData, harmonyRatingsData, mismatchesData] = await Promise.all([
        getSearchAnalyticsSummary(30),
        getDiscoveryFeedback(100),
        getHarmonyRatingSummary(30),
        getHarmonyRatings(1000),
        getMismatches(100),
      ]);

      setAnalytics(analyticsData);
      setDiscoveryFeedback(discoveryData);
      setHarmonySummary(harmonySummaryData);
      setHarmonyRatings(harmonyRatingsData);
      setMismatches(mismatchesData);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      setError("Failed to load admin data. Please try again.");
    } finally {
      setAnalyticsLoading(false);
      setFeedbackLoading(false);
    }
  };

  // Prepare Discovery feedback rows for DataGrid
  const discoveryRows: GridRowsProp = useMemo(() => {
    return discoveryFeedback.map((item, idx) => {
      const searchContext = item.searchContext as any;
      const reportedResult = item.reportedResult as any;
      
      return {
        id: item.id || idx,
        type: item.discovery_search_feedback ? "Search Quality" : "General",
        reason: item.reason || "—",
        comment: item.comment || "—",
        searchQuery: searchContext?.query || "—",
        studyName: reportedResult?.dataset_schema?.name || 
                   reportedResult?.extra_data?.name || 
                   searchContext?.reportedResult?.dataset_schema?.name ||
                   searchContext?.reportedResult?.extra_data?.name ||
                   "—",
        studyUuid: reportedResult?.extra_data?.uuid || 
                   searchContext?.reportedResult?.extra_data?.uuid ||
                   "—",
        date: item.timestamp
          ? (item.timestamp as any).toDate
            ? (item.timestamp as any).toDate().toLocaleString()
            : new Date(item.timestamp as any).toLocaleString()
          : "—",
        rawData: item, // Store full item for potential expansion
      };
    });
  }, [discoveryFeedback]);

  // Discovery feedback columns
  const discoveryColumns: GridColDef[] = [
    { field: "type", headerName: "Type", width: 130 },
    { field: "reason", headerName: "Reason", width: 200, flex: 1 },
    { field: "comment", headerName: "Comment", width: 250, flex: 1 },
    { field: "searchQuery", headerName: "Search Query", width: 200, flex: 1 },
    { field: "studyName", headerName: "Reported Study", width: 250, flex: 1 },
    {
      field: "studyUuid",
      headerName: "Study UUID",
      width: 300,
      renderCell: (params) => {
        const uuid = params.value as string;
        if (uuid === "—") return "—";
        return (
          <Typography
            variant="body2"
            sx={{
              fontFamily: "monospace",
              fontSize: "0.75rem",
              wordBreak: "break-all",
            }}
          >
            {uuid}
          </Typography>
        );
      },
    },
    { field: "date", headerName: "Date", width: 180 },
  ];

  // Prepare Harmony rating rows for DataGrid
  const harmonyRows: GridRowsProp = useMemo(() => {
    if (!harmonySummary) return [];
    return harmonySummary.ratingsByDay.map((item, idx) => ({
      id: idx,
      date: item.date,
      avgRating: item.avgRating,
      count: item.count,
    }));
  }, [harmonySummary]);

  // Harmony rating columns
  const harmonyColumns: GridColDef[] = [
    { field: "date", headerName: "Date", width: 150 },
    {
      field: "avgRating",
      headerName: "Average Rating",
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          ⭐ {params.value.toFixed(1)}/5
        </Typography>
      ),
    },
    { field: "count", headerName: "Number of Ratings", width: 180 },
  ];

  // Top queries rows for DataGrid
  const topQueriesRows: GridRowsProp = useMemo(() => {
    if (!analytics) return [];
    return analytics.topQueries.map((item, idx) => ({
      id: idx,
      query: item.query,
      searches: item.count,
      avgResults: item.avgResults,
      avgResponseTime: item.avgResponseTime,
    }));
  }, [analytics]);

  const topQueriesColumns: GridColDef[] = [
    { field: "query", headerName: "Query", flex: 1, minWidth: 200 },
    { field: "searches", headerName: "Searches", width: 120, align: "right", headerAlign: "right" },
    {
      field: "avgResults",
      headerName: "Avg Results",
      width: 150,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => value?.toLocaleString() || "0",
    },
    {
      field: "avgResponseTime",
      headerName: "Avg Response Time",
      width: 180,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => value ? `${value}ms` : "—",
    },
  ];

  // Prepare Mismatches rows for DataGrid
  const mismatchesRows: GridRowsProp = useMemo(() => {
    return mismatches.map((item) => {
      const q1 = item.q1 || {};
      const q2 = item.q2 || {};
      const modelUsed = item.model_used || {};
      
      // Calculate rating: find Q2's question_index, lookup in Q1's matches array, scale to percentage
      let rating: number | string = "—";
      if (q2.question_index !== undefined && q1.matches && Array.isArray(q1.matches)) {
        const q2Index = q2.question_index as number;
        if (q1.matches[q2Index] !== undefined) {
          const matchValue = q1.matches[q2Index] as number;
          // Scale from 0-1 to 0-100 percentage
          rating = Math.round(matchValue * 100 * 100) / 100; // Round to 2 decimal places
        }
      }
      
      return {
        id: item.id,
        date: item.created
          ? (item.created as any).toDate
            ? (item.created as any).toDate().toLocaleString()
            : new Date(item.created as any).toLocaleString()
          : "—",
        framework: modelUsed.framework || "—",
        q1Question: q1.question_text || "—",
        q2Question: q2.question_text || "—",
        rating: rating,
      };
    });
  }, [mismatches]);

  // Mismatches columns
  const mismatchesColumns: GridColDef[] = [
    { field: "date", headerName: "Date", width: 180 },
    { field: "framework", headerName: "Framework", width: 150 },
    {
      field: "q1Question",
      headerName: "Q1 Question",
      width: 400,
      flex: 1,
    },
    {
      field: "q2Question",
      headerName: "Q2 Question",
      width: 400,
      flex: 1,
    },
    {
      field: "rating",
      headerName: "Rating (%)",
      width: 120,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => {
        const value = params.value;
        if (value === "—" || value === null || value === undefined) {
          return "—";
        }
        return (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {typeof value === "number" ? `${value.toFixed(2)}%` : value}
          </Typography>
        );
      },
    },
  ];

  if (authLoading || analyticsLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Logged in as: {currentUser?.email}
      </Typography>

      {/* Analytics Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Searches (30 days)
              </Typography>
              <Typography variant="h4">
                {analytics?.totalSearches.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Avg Response Time
              </Typography>
              <Typography variant="h4">
                {analytics?.averageResponseTime || 0}ms
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Avg Results per Search
              </Typography>
              <Typography variant="h4">
                {analytics?.averageResults || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Three Charts Side by Side */}
      {analytics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Pagination Strategy Pie Chart */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Pagination Strategy
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.paginationStrategyCounts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.paginationStrategyCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={["#2E5FFF", "#90EE90", "#FF6B6B", "#FFD93D"][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [props.payload.strategy, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Filter Usage Bar Chart */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Filter Usage
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "None", value: analytics.filterUsage.none },
                      { name: "Source", value: analytics.filterUsage.source },
                      { name: "Topics", value: analytics.filterUsage.topics },
                      { name: "Study Design", value: analytics.filterUsage.study_design },
                      { name: "Sample Characteristics", value: analytics.filterUsage.sample_characteristics },
                      { name: "Instruments", value: analytics.filterUsage.instruments },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#90EE90" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Distance Strategy Pie Chart */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Distance Strategy
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.distanceStrategyCounts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.distanceStrategyCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={["#FF6B6B", "#FFD93D", "#6BCF7F", "#4D96FF"][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [props.payload.strategy, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Top Queries */}
      {analytics && analytics.topQueries.length > 0 && (
        <Paper sx={{ p: 3, mb: 4, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Top Search Queries (30 days)
          </Typography>
          <DataGrid
            rows={topQueriesRows}
            columns={topQueriesColumns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            disableRowSelectionOnClick
            sx={{ border: 0 }}
          />
        </Paper>
      )}

      {/* Feedback Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">Feedback</Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download size={16} />}
              onClick={() => {
                let dataToExport: any;
                let filename: string;
                
                if (feedbackView === "discovery") {
                  dataToExport = discoveryFeedback;
                  filename = `discovery-feedback-${new Date().toISOString().split("T")[0]}.json`;
                } else if (feedbackView === "harmony") {
                  dataToExport = harmonyRatings;
                  filename = `harmony-ratings-${new Date().toISOString().split("T")[0]}.json`;
                } else {
                  dataToExport = mismatches;
                  filename = `mismatches-${new Date().toISOString().split("T")[0]}.json`;
                }
                
                const jsonStr = JSON.stringify(dataToExport, null, 2);
                const blob = new Blob([jsonStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
            >
              Export Data
            </Button>
            <ToggleButtonGroup
              value={feedbackView}
              exclusive
              onChange={(_, newView) => {
                if (newView !== null) {
                  setFeedbackView(newView);
                }
              }}
              size="small"
            >
              <ToggleButton value="discovery">Discovery</ToggleButton>
              <ToggleButton value="harmony">Harmony</ToggleButton>
              <ToggleButton value="mismatches">Mismatches</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {feedbackLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : feedbackView === "discovery" ? (
          <>
            {discoveryFeedback.length === 0 ? (
              <Typography color="text.secondary">No discovery feedback yet.</Typography>
            ) : (
              <Box sx={{ height: 600 }}>
                <DataGrid
                  rows={discoveryRows}
                  columns={discoveryColumns}
                  pageSizeOptions={[10, 25, 50, 100]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                    sorting: { sortModel: [{ field: "date", sort: "desc" }] },
                  }}
                  disableRowSelectionOnClick
                  sx={{ border: 0 }}
                />
              </Box>
            )}
          </>
        ) : feedbackView === "harmony" ? (
          <>
            {harmonySummary && (
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                          Average Rating (30 days)
                        </Typography>
                        <Typography variant="h4">
                          ⭐ {harmonySummary.averageRating.toFixed(1)}/5
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                          Total Ratings (30 days)
                        </Typography>
                        <Typography variant="h4">
                          {harmonySummary.totalRatings.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
            {harmonyRows.length === 0 ? (
              <Typography color="text.secondary">No harmony ratings yet.</Typography>
            ) : (
              <Box sx={{ height: 400 }}>
                <DataGrid
                  rows={harmonyRows}
                  columns={harmonyColumns}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                    sorting: { sortModel: [{ field: "date", sort: "desc" }] },
                  }}
                  disableRowSelectionOnClick
                  sx={{ border: 0 }}
                />
              </Box>
            )}
          </>
        ) : (
          <>
            {mismatches.length === 0 ? (
              <Typography color="text.secondary">No mismatches reported yet.</Typography>
            ) : (
              <Box sx={{ height: 600 }}>
                <DataGrid
                  rows={mismatchesRows}
                  columns={mismatchesColumns}
                  pageSizeOptions={[10, 25, 50, 100]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                    sorting: { sortModel: [{ field: "date", sort: "desc" }] },
                  }}
                  disableRowSelectionOnClick
                  sx={{ border: 0 }}
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
}
