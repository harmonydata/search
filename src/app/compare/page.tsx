"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  useMediaQuery,
  useTheme,
  Paper,
  TextField,
  InputAdornment,
} from "@mui/material";
import { CompareArrows, Refresh, AutoAwesome } from "@mui/icons-material";
import { Search, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import CompactResultCard from "@/components/CompactResultCard";
import { SearchResult, fetchResultByUuid } from "@/services/api";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore/lite";
import { db } from "../../firebase";

interface SavedHarmonization {
  id: string;
  title: string;
  description?: string;
  created: any;
  updated?: any;
  lastAccessed?: any;
  public: boolean;
  uid: string;
  apiData?: {
    instruments?: Array<{
      name: string;
      [key: string]: any;
    }>;
  };
}

interface SavedResource {
  id: string;
  title: string;
  description?: string;
  image?: string;
  uuid: string;
  slug?: string;
  resourceType: string;
  // Data for CompactResultCard display
  keywords?: string[];
  variablesCount?: number;
  datasetsCount?: number;
  hasDataAvailable?: boolean;
  hasFreeAccess?: boolean;
  hasCohortsAvailable?: boolean;
  created: any;
  uid: string;
}

// Adapter function to convert SavedResource to SearchResult format for CompactResultCard
const convertSavedResourceToSearchResult = (
  resource: SavedResource
): SearchResult => {
  // Calculate variables count from either the saved count or create a mock array
  const variablesCount = resource.variablesCount || 0;
  const mockVariables =
    variablesCount > 0 ? Array(variablesCount).fill({ name: "Variable" }) : [];

  return {
    extra_data: {
      uuid: resource.uuid,
      slug: resource.slug,
      resource_type: resource.resourceType,
      name: resource.title,
      description: resource.description,
      keywords: resource.keywords || [],
      number_of_variables: variablesCount,
    },
    dataset_schema: {
      name: resource.title,
      description: resource.description,
      keywords: resource.keywords || [],
      number_of_variables: variablesCount,
      variableMeasured: mockVariables,
      includedInDataCatalog: resource.hasDataAvailable ? [{}] : [],
    },
    child_datasets: Array(resource.datasetsCount || 0).fill({}),
    hasFreeAccess: resource.hasFreeAccess || false,
    hasCohortsAvailable: resource.hasCohortsAvailable || false,
    // Add image property for CompactResultCard
    thumbnail: resource.image,
  } as SearchResult;
};

export default function ComparePage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // State for saved resources
  const [savedResources, setSavedResources] = useState<SavedResource[]>([]);
  const [savedHarmonisations, setSavedHarmonisations] = useState<
    SavedHarmonization[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for comparison
  const [selectedItem1, setSelectedItem1] = useState<
    SavedResource | SavedHarmonization | null
  >(null);
  const [selectedItem2, setSelectedItem2] = useState<
    SavedResource | SavedHarmonization | null
  >(null);
  const [fullResource1, setFullResource1] = useState<any>(null);
  const [fullResource2, setFullResource2] = useState<any>(null);
  const [sharedData, setSharedData] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);

  // State for filtering
  const [searchTerm, setSearchTerm] = useState("");

  // Ref for scrolling to AI summary
  const aiSummaryRef = useRef<HTMLDivElement>(null);

  // Load saved resources
  useEffect(() => {
    const loadAllData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load saved resources
        const resourcesQuery = query(
          collection(db, "saved_resources"),
          where("uid", "==", currentUser.uid),
          orderBy("created", "desc"),
          limit(50)
        );
        const resourcesSnapshot = await getDocs(resourcesQuery);
        const resourcesData: SavedResource[] = [];
        resourcesSnapshot.forEach((doc) => {
          resourcesData.push({
            id: doc.id,
            ...doc.data(),
          } as SavedResource);
        });

        // Load saved harmonisations
        const harmonisationsQuery = query(
          collection(db, "harmonisations"),
          where("uid", "==", currentUser.uid),
          orderBy("created", "desc"),
          limit(50)
        );
        const harmonisationsSnapshot = await getDocs(harmonisationsQuery);
        const harmonisationsData: SavedHarmonization[] = [];
        harmonisationsSnapshot.forEach((doc) => {
          harmonisationsData.push({
            id: doc.id,
            ...doc.data(),
          } as SavedHarmonization);
        });

        setSavedResources(resourcesData);
        setSavedHarmonisations(harmonisationsData);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load saved items");
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [currentUser]);

  // Filter items based on search term and type
  const filteredItems = [...savedResources, ...savedHarmonisations].filter(
    (item) => {
      const matchesSearch = item.title
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType = "uuid" in item; // Only show resources
      return matchesSearch && matchesType;
    }
  );

  // Compare two items
  const compareItems = async () => {
    if (!selectedItem1 || !selectedItem2) return;

    setLoadingComparison(true);
    setFullResource1(null);
    setFullResource2(null);
    setSharedData(null);
    setAiSummary(null);

    try {
      // Only compare resources (not harmonisations)
      if (!("uuid" in selectedItem1) || !("uuid" in selectedItem2)) {
        setError(
          "Only resources can be compared. Please select two saved resources."
        );
        return;
      }

      // Fetch full lookup data by UUID for finding similarities
      const [lookupData1, lookupData2] = await Promise.all([
        fetchResultByUuid(selectedItem1.uuid),
        fetchResultByUuid(selectedItem2.uuid),
      ]);

      setFullResource1(lookupData1);
      setFullResource2(lookupData2);

      // Find shared data using the full lookup data
      const shared = findSharedData(lookupData1, lookupData2);
      setSharedData(shared);

      // Generate AI summary with the saved resource data (not the full lookup data)
      await generateAiSummary(selectedItem1, selectedItem2);
    } catch (err) {
      console.error("Error comparing items:", err);
      setError("Failed to compare items");
    } finally {
      setLoadingComparison(false);
    }
  };

  // Find shared data between two resources
  const findSharedData = (resource1: SearchResult, resource2: SearchResult) => {
    const shared = {
      topics: [] as string[],
      studyDesigns: [] as string[],
      sources: [] as string[],
      dataCatalogs: [] as any[],
      keywords: [] as string[],
      countries: [] as string[],
      ageRanges: [] as string[],
    };

    // Find shared topics from dataset_schema keywords
    const topics1 = resource1.dataset_schema?.keywords || [];
    const topics2 = resource2.dataset_schema?.keywords || [];
    shared.topics = topics1.filter((topic: string) =>
      topics2.some(
        (topic2: string) => topic.toLowerCase() === topic2.toLowerCase()
      )
    );

    // Find shared study designs from extra_data
    const designs1 = resource1.extra_data?.study_design || [];
    const designs2 = resource2.extra_data?.study_design || [];
    shared.studyDesigns = designs1.filter((design: string) =>
      designs2.some(
        (design2: string) => design.toLowerCase() === design2.toLowerCase()
      )
    );

    // Find shared sources (publisher names) from dataset_schema
    const sources1 = resource1.dataset_schema?.publisher || [];
    const sources2 = resource2.dataset_schema?.publisher || [];
    shared.sources = sources1
      .filter((pub1: any) =>
        sources2.some(
          (pub2: any) => pub1.name?.toLowerCase() === pub2.name?.toLowerCase()
        )
      )
      .map((pub: any) => pub.name)
      .filter(Boolean);

    // Find shared data catalogs from dataset_schema
    const catalogs1 = resource1.dataset_schema?.includedInDataCatalog || [];
    const catalogs2 = resource2.dataset_schema?.includedInDataCatalog || [];
    shared.dataCatalogs = catalogs1.filter((catalog: any) =>
      catalogs2.some(
        (catalog2: any) =>
          catalog.name?.toLowerCase() === catalog2.name?.toLowerCase()
      )
    );

    // Find shared keywords from extra_data
    const keywords1 = resource1.extra_data?.keywords || [];
    const keywords2 = resource2.extra_data?.keywords || [];
    shared.keywords = keywords1.filter((keyword: string) =>
      keywords2.some(
        (keyword2: string) => keyword.toLowerCase() === keyword2.toLowerCase()
      )
    );

    // Find shared countries from extra_data
    const countries1 = resource1.extra_data?.country_codes || [];
    const countries2 = resource2.extra_data?.country_codes || [];
    shared.countries = countries1.filter((country: string) =>
      countries2.some(
        (country2: string) => country.toLowerCase() === country2.toLowerCase()
      )
    );

    // Find shared age ranges
    const age1Lower = resource1.extra_data?.age_lower;
    const age1Upper = resource1.extra_data?.age_upper;
    const age2Lower = resource2.extra_data?.age_lower;
    const age2Upper = resource2.extra_data?.age_upper;

    if (
      age1Lower !== undefined &&
      age1Upper !== undefined &&
      age2Lower !== undefined &&
      age2Upper !== undefined
    ) {
      // Check if age ranges overlap
      if (age1Lower <= age2Upper && age1Upper >= age2Lower) {
        shared.ageRanges = [
          `${Math.max(age1Lower, age2Lower)}-${Math.min(age1Upper, age2Upper)}`,
        ];
      }
    }

    return shared;
  };

  // Generate AI summary
  const generateAiSummary = async (item1: any, item2: any) => {
    setLoadingAi(true);
    try {
      const systemPrompt = `You are a helpful assistant that compares academic research entities. You will receive a JSON object containing two research studies, datasets, or harmonisations to compare. Please provide a concise summary highlighting the key similarities and differences between these entities, focusing on their purpose, scope, methodology, and any other relevant aspects that would help researchers understand how these entities relate to each other.`;

      const textContent = JSON.stringify(
        {
          item1,
          item2,
        },
        null,
        2
      );

      const requestData = {
        system: systemPrompt,
        text: textContent,
      };

      const response = await fetch(
        "https://harmonydatagpt.azureedge.net/api/cleanup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Handle the array format from the API
      if (Array.isArray(result)) {
        const formattedSummary = result
          .map((item) => item.question_text)
          .join("\n\n");
        setAiSummary(formattedSummary);
      } else {
        setAiSummary(result.result || result);
      }
    } catch (err) {
      console.error("Error generating AI summary:", err);
      setAiSummary("Unable to generate AI summary at this time.");
    } finally {
      setLoadingAi(false);
      // Smooth scroll to AI summary when it's ready
      setTimeout(() => {
        if (aiSummaryRef.current) {
          aiSummaryRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100); // Small delay to ensure the content is rendered
    }
  };

  // Reset comparison
  const resetComparison = () => {
    setSelectedItem1(null);
    setSelectedItem2(null);
    setFullResource1(null);
    setFullResource2(null);
    setSharedData(null);
    setAiSummary(null);
  };

  if (!currentUser) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Compare Research Entities
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          This feature allows you to compare different research studies and
          harmonisations from your saved items.
        </Typography>

        <Card sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
          <Typography variant="h6" gutterBottom color="primary">
            Sign in to Compare Your Research
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This feature only works if you login. It only takes a moment to
            create an account and allows you to save your research results for
            future comparison.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            By signing in, you can:
          </Typography>
          <Box component="ul" sx={{ textAlign: "left", mb: 3 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Save research studies and harmonisations
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Compare different research entities
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Get AI-powered comparison summaries
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Access your saved items across sessions
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            We respect your privacy. Please review our{" "}
            <a
              href="https://harmonydata.ac.uk/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              privacy policy
            </a>{" "}
            to understand how we handle your data.
          </Typography>
        </Card>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading your saved items...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Compare Research Entities
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Select two saved resources to compare their similarities and
        differences.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* No saved resources alert */}
      {savedResources.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have no saved resources. You need to save some studies or datasets
          before you can compare them. Go to the search page to find and save
          resources that interest you.
        </Alert>
      )}

      {/* Search Filter */}
      {savedResources.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Paper>
      )}

      {savedResources.length > 0 && (
        <Grid container spacing={3}>
          {/* Item Selection */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Select First Item
                </Typography>
                <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                  {filteredItems.map((item) => {
                    // For resources, use CompactResultCard; for harmonisations, use custom card
                    if ("uuid" in item) {
                      const searchResult =
                        convertSavedResourceToSearchResult(item);
                      return (
                        <Box
                          key={`resource-${item.id}`}
                          sx={{
                            mb: 2,
                            border:
                              selectedItem1?.id === item.id
                                ? "2px solid"
                                : "1px solid",
                            borderColor:
                              selectedItem1?.id === item.id
                                ? "primary.main"
                                : "grey.200",
                            borderRadius: 2,
                            overflow: "hidden",
                          }}
                          onClick={() => setSelectedItem1(item)}
                        >
                          <CompactResultCard
                            result={searchResult}
                            onClick={() => setSelectedItem1(item)}
                          />
                        </Box>
                      );
                    } else {
                      // For harmonisations, create a custom card
                      const instrumentNames =
                        item.apiData?.instruments
                          ?.map((inst) => inst.name)
                          .filter(Boolean) || [];
                      const harmonizationTitle =
                        instrumentNames.length > 0
                          ? instrumentNames.join(" with ")
                          : "Untitled Harmonization";

                      return (
                        <Card
                          key={`harmonisation-${item.id}`}
                          sx={{
                            mb: 2,
                            cursor: "pointer",
                            border:
                              selectedItem1?.id === item.id
                                ? "2px solid"
                                : "1px solid",
                            borderColor:
                              selectedItem1?.id === item.id
                                ? "primary.main"
                                : "grey.200",
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                          onClick={() => setSelectedItem1(item)}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 1,
                              }}
                            >
                              <Chip
                                label="harmonisation"
                                size="small"
                                color="secondary"
                              />
                              <Typography variant="h6" sx={{ flex: 1 }}>
                                {harmonizationTitle}
                              </Typography>
                            </Box>
                            {item.description && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {item.description.substring(0, 100)}
                                {item.description.length > 100 && "..."}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      );
                    }
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Select Second Item
                </Typography>
                <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                  {filteredItems.map((item) => {
                    // For resources, use CompactResultCard; for harmonisations, use custom card
                    if ("uuid" in item) {
                      const searchResult =
                        convertSavedResourceToSearchResult(item);
                      return (
                        <Box
                          key={`resource-${item.id}`}
                          sx={{
                            mb: 2,
                            border:
                              selectedItem2?.id === item.id
                                ? "2px solid"
                                : "1px solid",
                            borderColor:
                              selectedItem2?.id === item.id
                                ? "primary.main"
                                : "grey.200",
                            borderRadius: 2,
                            overflow: "hidden",
                          }}
                          onClick={() => setSelectedItem2(item)}
                        >
                          <CompactResultCard
                            result={searchResult}
                            onClick={() => setSelectedItem2(item)}
                          />
                        </Box>
                      );
                    } else {
                      // For harmonisations, create a custom card
                      const instrumentNames =
                        item.apiData?.instruments
                          ?.map((inst) => inst.name)
                          .filter(Boolean) || [];
                      const harmonizationTitle =
                        instrumentNames.length > 0
                          ? instrumentNames.join(" with ")
                          : "Untitled Harmonization";

                      return (
                        <Card
                          key={`harmonisation-${item.id}`}
                          sx={{
                            mb: 2,
                            cursor: "pointer",
                            border:
                              selectedItem2?.id === item.id
                                ? "2px solid"
                                : "1px solid",
                            borderColor:
                              selectedItem2?.id === item.id
                                ? "primary.main"
                                : "grey.200",
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                          onClick={() => setSelectedItem2(item)}
                        >
                          <CardContent sx={{ p: 2 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 1,
                              }}
                            >
                              <Chip
                                label="harmonisation"
                                size="small"
                                color="secondary"
                              />
                              <Typography variant="h6" sx={{ flex: 1 }}>
                                {harmonizationTitle}
                              </Typography>
                            </Box>
                            {item.description && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {item.description.substring(0, 100)}
                                {item.description.length > 100 && "..."}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      );
                    }
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Comparison Actions */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button
                variant="contained"
                startIcon={<CompareArrows />}
                onClick={compareItems}
                disabled={!selectedItem1 || !selectedItem2 || loadingComparison}
                size="large"
              >
                {loadingComparison ? "Comparing..." : "Compare Items"}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={resetComparison}
                disabled={!selectedItem1 && !selectedItem2}
              >
                Reset
              </Button>
            </Box>
          </Grid>

          {/* Comparison Results */}
          {fullResource1 && fullResource2 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Comparison Results
                  </Typography>

                  {/* Shared Data */}
                  {sharedData && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom color="primary">
                        Shared Elements
                      </Typography>

                      {/* Shared Topics */}
                      {sharedData.topics.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Shared Topics ({sharedData.topics.length})
                          </Typography>
                          <Box
                            sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                          >
                            {sharedData.topics.map(
                              (topic: string, index: number) => (
                                <Chip
                                  key={index}
                                  label={topic}
                                  color="primary"
                                  variant="outlined"
                                  size="small"
                                />
                              )
                            )}
                          </Box>
                        </Box>
                      )}

                      {/* Shared Study Designs */}
                      {sharedData.studyDesigns.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Shared Study Designs (
                            {sharedData.studyDesigns.length})
                          </Typography>
                          <Box
                            sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                          >
                            {sharedData.studyDesigns.map(
                              (design: string, index: number) => (
                                <Chip
                                  key={index}
                                  label={design}
                                  color="secondary"
                                  variant="outlined"
                                  size="small"
                                />
                              )
                            )}
                          </Box>
                        </Box>
                      )}

                      {/* Shared Sources */}
                      {sharedData.sources.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Shared Sources ({sharedData.sources.length})
                          </Typography>
                          <Box
                            sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                          >
                            {sharedData.sources.map(
                              (source: string, index: number) => (
                                <Chip
                                  key={index}
                                  label={source}
                                  color="success"
                                  variant="outlined"
                                  size="small"
                                />
                              )
                            )}
                          </Box>
                        </Box>
                      )}

                      {/* Shared Data Catalogs */}
                      {sharedData.dataCatalogs.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Shared Data Catalogs (
                            {sharedData.dataCatalogs.length})
                          </Typography>
                          <Box
                            sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                          >
                            {sharedData.dataCatalogs.map(
                              (catalog: any, index: number) => (
                                <Chip
                                  key={index}
                                  label={catalog.name}
                                  color="info"
                                  variant="outlined"
                                  size="small"
                                />
                              )
                            )}
                          </Box>
                        </Box>
                      )}

                      {sharedData.topics.length === 0 &&
                        sharedData.studyDesigns.length === 0 &&
                        sharedData.sources.length === 0 &&
                        sharedData.dataCatalogs.length === 0 && (
                          <Typography variant="body2" color="text.secondary">
                            No shared elements found between these resources.
                          </Typography>
                        )}
                    </Box>
                  )}

                  {/* AI Summary */}
                  <Accordion defaultExpanded ref={aiSummaryRef}>
                    <AccordionSummary expandIcon={<ChevronDown />}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <AutoAwesome />
                        <Typography variant="h6">AI Analysis</Typography>
                        {loadingAi && <CircularProgress size={20} />}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {aiSummary ? (
                        <Box sx={{ whiteSpace: "pre-wrap" }}>
                          {aiSummary.split("\n\n").map((paragraph, index) => {
                            // Handle markdown bold formatting
                            const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                            return (
                              <Typography
                                key={index}
                                variant="body1"
                                sx={{ mb: 2 }}
                              >
                                {parts.map((part, partIndex) => {
                                  if (
                                    part.startsWith("**") &&
                                    part.endsWith("**")
                                  ) {
                                    return (
                                      <Typography
                                        key={partIndex}
                                        component="span"
                                        sx={{ fontWeight: "bold" }}
                                      >
                                        {part.slice(2, -2)}
                                      </Typography>
                                    );
                                  }
                                  return part;
                                })}
                              </Typography>
                            );
                          })}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          AI analysis will appear here after comparison.
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
