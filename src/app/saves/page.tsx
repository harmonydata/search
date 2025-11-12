"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  useMediaQuery,
  useTheme,
  TextField,
  InputAdornment,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Heart,
  Bookmark,
  Delete,
  ChevronDown,
  Lock,
  Globe,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import { useRouter } from "next/navigation";
import CompactResultCard from "@/components/CompactResultCard";
import { SearchResult } from "@/services/api";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  orderBy,
  limit,
} from "firebase/firestore/lite";
import { db } from "../../firebase";
import { getHarmonizationUrl } from "@/lib/utils/urlHelpers";
import { getAssetPrefix } from "@/lib/utils/shared";
import Image from "next/image";

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

interface SavedSearch {
  id: string;
  query: string;
  filters?: Record<string, string[]>;
  useSearch2?: boolean;
  hybridWeight?: number;
  maxDistance?: number;
  selectedCategory?: string | null;
  resultCount: number;
  created: any;
  uid: string;
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

export default function SavesPage() {
  const { currentUser } = useAuth();
  const { loadSearchFromSaved } = useSearch();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [harmonizations, setHarmonizations] = useState<SavedHarmonization[]>(
    []
  );
  const [recentPublicHarmonizations, setRecentPublicHarmonizations] = useState<
    SavedHarmonization[]
  >([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savedResources, setSavedResources] = useState<SavedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Load saved harmonizations
  const loadHarmonizations = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, "harmonisations"),
        where("uid", "==", currentUser.uid),
        orderBy("created", "desc"),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const harmonizationsData: SavedHarmonization[] = [];

      querySnapshot.forEach((doc) => {
        harmonizationsData.push({
          id: doc.id,
          ...doc.data(),
        } as SavedHarmonization);
      });

      setHarmonizations(harmonizationsData);
    } catch (err) {
      console.error("Error loading harmonizations:", err);
      setError("Failed to load harmonizations");
    }
  };

  // Load recent public harmonizations
  const loadRecentPublicHarmonizations = async () => {
    try {
      const q = query(
        collection(db, "harmonisations"),
        where("public", "==", true),
        orderBy("lastAccessed", "desc"),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const recentPublicData: SavedHarmonization[] = [];

      querySnapshot.forEach((doc) => {
        recentPublicData.push({
          id: doc.id,
          ...doc.data(),
        } as SavedHarmonization);
      });

      setRecentPublicHarmonizations(recentPublicData);
    } catch (err) {
      console.error("Error loading recent public harmonizations:", err);
    }
  };

  // Load saved searches
  const loadSavedSearches = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, "saved_searches"),
        where("uid", "==", currentUser.uid),
        orderBy("created", "desc"),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const searchesData: SavedSearch[] = [];

      querySnapshot.forEach((doc) => {
        searchesData.push({
          id: doc.id,
          ...doc.data(),
        } as SavedSearch);
      });

      setSavedSearches(searchesData);
    } catch (err) {
      console.error("Error loading saved searches:", err);
    }
  };

  // Load saved resources
  const loadSavedResources = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, "saved_resources"),
        where("uid", "==", currentUser.uid),
        orderBy("created", "desc"),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const resourcesData: SavedResource[] = [];

      querySnapshot.forEach((doc) => {
        resourcesData.push({
          id: doc.id,
          ...doc.data(),
        } as SavedResource);
      });

      setSavedResources(resourcesData);
    } catch (err) {
      console.error("Error loading saved resources:", err);
    }
  };

  // Load all data
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setError(null);

      await Promise.all([
        loadHarmonizations(),
        loadRecentPublicHarmonizations(),
        loadSavedSearches(),
        loadSavedResources(),
      ]);

      setLoading(false);
    };

    if (currentUser) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  // Delete saved search
  const deleteSavedSearch = async (searchId: string) => {
    try {
      await deleteDoc(doc(db, "saved_searches", searchId));
      setSavedSearches((prev) => prev.filter((s) => s.id !== searchId));
    } catch (err) {
      console.error("Error deleting saved search:", err);
    }
  };

  // Delete saved resource
  const deleteSavedResource = async (resourceId: string) => {
    try {
      await deleteDoc(doc(db, "saved_resources", resourceId));
      setSavedResources((prev) => prev.filter((r) => r.id !== resourceId));
    } catch (err) {
      console.error("Error deleting saved resource:", err);
    }
  };

  // Delete harmonization
  const deleteHarmonization = async (harmonizationId: string) => {
    try {
      await deleteDoc(doc(db, "harmonisations", harmonizationId));
      setHarmonizations((prev) => prev.filter((h) => h.id !== harmonizationId));
    } catch (err) {
      console.error("Error deleting harmonization:", err);
    }
  };

  // Load search settings and navigate to discover page
  const loadSearch = (search: SavedSearch) => {
    loadSearchFromSaved({
      query: search.query,
      filters: search.filters,
      useSearch2: search.useSearch2,
      hybridWeight: search.hybridWeight,
      maxDistance: search.maxDistance,
      selectedCategory: search.selectedCategory,
    });
    router.push("/discover");
  };

  // Filter functions for each section
  const filterRecentPublicHarmonizations = (
    harmonizations: SavedHarmonization[]
  ) => {
    return harmonizations.filter((harmonization) => {
      const instrumentNames =
        harmonization.apiData?.instruments
          ?.map((inst) => inst.name)
          .filter(Boolean) || [];
      const harmonizationTitle =
        instrumentNames.length > 0
          ? instrumentNames.join(" with ")
          : "Untitled Harmonization";

      const matchesSearch = harmonizationTitle
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType =
        typeFilter === "all" || typeFilter === "harmonisation";

      return matchesSearch && matchesType;
    });
  };

  const filterHarmonizations = (harmonizations: SavedHarmonization[]) => {
    return harmonizations.filter((harmonization) => {
      const instrumentNames =
        harmonization.apiData?.instruments
          ?.map((inst) => inst.name)
          .filter(Boolean) || [];
      const harmonizationTitle =
        instrumentNames.length > 0
          ? instrumentNames.join(" with ")
          : "Untitled Harmonization";

      const matchesSearch = harmonizationTitle
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType =
        typeFilter === "all" || typeFilter === "harmonisation";

      return matchesSearch && matchesType;
    });
  };

  const filterSavedSearches = (searches: SavedSearch[]) => {
    return searches.filter((search) => {
      const matchesSearch = search.query
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || typeFilter === "search";

      return matchesSearch && matchesType;
    });
  };

  const filterSavedResources = (resources: SavedResource[]) => {
    return resources.filter((resource) => {
      const matchesSearch = resource.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || typeFilter === "resource";

      return matchesSearch && matchesType;
    });
  };

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          My Saves
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          This feature allows you to manage your saved harmonizations, searches,
          and resources from your research.
        </Typography>

        <Card sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
          <Typography variant="h6" gutterBottom color="primary">
            Sign in to Access Your Saves
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This feature only works if you login. It only takes a moment to
            create an account and allows you to save your research results for
            future access.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            By signing in, you can:
          </Typography>
          <Box component="ul" sx={{ textAlign: "left", mb: 3 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Save research studies and harmonisations
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Save your search queries and results
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Access your saved items across sessions
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Organize and manage your research collection
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
      <Box
        sx={{
          p: 3,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        My Saves
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your saved harmonizations, searches, and resources.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Search and Filter Bar */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              placeholder="Search saved items..."
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
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="harmonisation">Harmonizations</MenuItem>
                <MenuItem value="search">Searches</MenuItem>
                <MenuItem value="resource">Resources</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Saved Resources */}
      <Accordion defaultExpanded sx={{ mb: 2 }}>
        <AccordionSummary
          expandIcon={<ChevronDown size={20} />}
          sx={{
            bgcolor: "background.paper",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Bookmark size={20} />
            <Typography variant="h6">Saved Resources</Typography>
            <Chip
              label={filterSavedResources(savedResources).length}
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {(() => {
            const filteredResources = filterSavedResources(savedResources);
            return savedResources.length === 0 ? (
              <Typography color="text.secondary">
                No resources saved yet. Save studies and datasets from the
                discovery page to see them here.
              </Typography>
            ) : filteredResources.length === 0 ? (
              <Typography color="text.secondary">
                No resources match your search criteria.
              </Typography>
            ) : (
              <Box>
                {filteredResources.map((resource) => {
                  const searchResult =
                    convertSavedResourceToSearchResult(resource);
                  return (
                    <Box key={resource.id} sx={{ position: "relative", mb: 2 }}>
                      <CompactResultCard
                        result={searchResult}
                        onClick={() => {
                          // Navigate to the static resource page
                          const resourcePath =
                            resource.resourceType === "study"
                              ? "studies"
                              : "items";

                          let identifier;

                          if (resourcePath === "studies") {
                            // For studies, only use slug (no UUID fallback)
                            identifier = resource.slug;
                          } else {
                            // For items, use slug or UUID, with length check
                            identifier = resource.slug || resource.uuid;
                            if (resource.slug && resource.slug.length > 220) {
                              identifier = resource.uuid;
                            }
                          }

                          const url = `${getAssetPrefix()}${resourcePath}/${identifier}`;
                          window.location.href = url;
                        }}
                      />
                      {/* Delete button overlay */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          zIndex: 1,
                        }}
                      >
                        <Tooltip title="Delete">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSavedResource(resource.id);
                            }}
                            startIcon={<Trash2 size={16} />}
                            sx={{
                              backgroundColor: "rgba(255, 255, 255, 0.9)",
                              color: "error.main",
                              borderColor: "error.main",
                              "&:hover": {
                                backgroundColor: "error.main",
                                color: "white",
                              },
                            }}
                          >
                            {!isMobile && "Delete"}
                          </Button>
                        </Tooltip>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            );
          })()}
        </AccordionDetails>
      </Accordion>

      {/* Recent Public Harmonizations */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary
          expandIcon={<ChevronDown size={20} />}
          sx={{
            bgcolor: "background.paper",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Globe size={20} />
            <Typography variant="h6">Recent Public Harmonizations</Typography>
            <Chip
              label={
                filterRecentPublicHarmonizations(recentPublicHarmonizations)
                  .length
              }
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {(() => {
            const filteredHarmonizations = filterRecentPublicHarmonizations(
              recentPublicHarmonizations
            );
            return filteredHarmonizations.length === 0 ? (
              <Typography color="text.secondary">
                {recentPublicHarmonizations.length === 0
                  ? "No recent public harmonizations found."
                  : "No harmonizations match your search criteria."}
              </Typography>
            ) : (
              <Box>
                {filteredHarmonizations.map((harmonization) => {
                  // Extract instrument names for display from apiData
                  const instrumentNames =
                    harmonization.apiData?.instruments
                      ?.map((inst) => inst.name)
                      .filter(Boolean) || [];

                  // Create title from instrument names or fallback
                  const harmonizationTitle =
                    instrumentNames.length > 0
                      ? instrumentNames.join(" with ")
                      : "Untitled Harmonization";

                  return (
                    <Box
                      key={harmonization.id}
                      sx={{ position: "relative", mb: 2 }}
                    >
                      <Tooltip title="Click to view in Harmony">
                        <Card
                          sx={{
                            cursor: "pointer",
                            "&:hover": { bgcolor: "action.hover" },
                            p: 2,
                          }}
                          onClick={() => {
                            window.location.href = getHarmonizationUrl(
                              harmonization.id
                            );
                          }}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 1,
                              }}
                            >
                              <Globe size={16} color="#4caf50" />
                              <Typography variant="h6" sx={{ flex: 1 }}>
                                {harmonizationTitle}
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              Last accessed:{" "}
                              {harmonization.lastAccessed
                                ?.toDate?.()
                                ?.toLocaleDateString() || "Unknown"}
                              {" • Created: "}
                              {harmonization.created
                                ?.toDate?.()
                                ?.toLocaleDateString() || "Unknown"}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Tooltip>
                      {/* Delete button overlay */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          zIndex: 1,
                        }}
                      >
                        <Tooltip title="Delete">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHarmonization(harmonization.id);
                            }}
                            startIcon={<Trash2 size={16} />}
                            sx={{
                              backgroundColor: "rgba(255, 255, 255, 0.9)",
                              color: "error.main",
                              borderColor: "error.main",
                              "&:hover": {
                                backgroundColor: "error.main",
                                color: "white",
                              },
                            }}
                          >
                            {!isMobile && "Delete"}
                          </Button>
                        </Tooltip>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            );
          })()}
        </AccordionDetails>
      </Accordion>

      {/* Saved Harmonizations */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary
          expandIcon={<ChevronDown size={20} />}
          sx={{
            bgcolor: "background.paper",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Heart size={20} />
            <Typography variant="h6">My Harmonizations</Typography>
            <Chip
              label={filterHarmonizations(harmonizations).length}
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {(() => {
            const filteredHarmonizations = filterHarmonizations(harmonizations);
            return harmonizations.length === 0 ? (
              <Typography color="text.secondary">
                No harmonizations saved yet. Create some harmonizations in the
                Harmony app to see them here.
              </Typography>
            ) : filteredHarmonizations.length === 0 ? (
              <Typography color="text.secondary">
                No harmonizations match your search criteria.
              </Typography>
            ) : (
              <Box>
                {filteredHarmonizations.map((harmonization) => {
                  // Extract instrument names for display from apiData
                  const instrumentNames =
                    harmonization.apiData?.instruments
                      ?.map((inst) => inst.name)
                      .filter(Boolean) || [];

                  // Create title from instrument names or fallback
                  const harmonizationTitle =
                    instrumentNames.length > 0
                      ? instrumentNames.join(" with ")
                      : "Untitled Harmonization";

                  // Calculate total questions count from all instruments
                  const totalQuestions =
                    harmonization.apiData?.instruments?.reduce(
                      (total, instrument) =>
                        total + (instrument.questions?.length || 0),
                      0
                    ) || 0;

                  return (
                    <Box
                      key={harmonization.id}
                      sx={{ position: "relative", mb: 2 }}
                    >
                      <Tooltip title="Click to view in Harmony">
                        <Card
                          sx={{
                            cursor: "pointer",
                            "&:hover": { bgcolor: "action.hover" },
                            p: 2,
                          }}
                          onClick={() => {
                            window.location.href = getHarmonizationUrl(
                              harmonization.id
                            );
                          }}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 1,
                              }}
                            >
                              {harmonization.public ? (
                                <Globe size={16} color="#4caf50" />
                              ) : (
                                <Lock size={16} color="#666" />
                              )}
                              <Typography variant="h6" sx={{ flex: 1 }}>
                                {harmonizationTitle}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1 }}
                            >
                              Created:{" "}
                              {harmonization.created
                                ?.toDate?.()
                                ?.toLocaleDateString() || "Unknown"}
                              {harmonization.lastAccessed && (
                                <>
                                  {" • Last accessed: "}
                                  {harmonization.lastAccessed
                                    ?.toDate?.()
                                    ?.toLocaleDateString() || "Unknown"}
                                </>
                              )}
                            </Typography>
                            {totalQuestions > 0 && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {totalQuestions} questions harmonized
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Tooltip>
                      {/* Delete button overlay */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          zIndex: 1,
                        }}
                      >
                        <Tooltip title="Delete">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHarmonization(harmonization.id);
                            }}
                            startIcon={<Trash2 size={16} />}
                            sx={{
                              backgroundColor: "rgba(255, 255, 255, 0.9)",
                              color: "error.main",
                              borderColor: "error.main",
                              "&:hover": {
                                backgroundColor: "error.main",
                                color: "white",
                              },
                            }}
                          >
                            {!isMobile && "Delete"}
                          </Button>
                        </Tooltip>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            );
          })()}
        </AccordionDetails>
      </Accordion>

      {/* Saved Searches */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary
          expandIcon={<ChevronDown size={20} />}
          sx={{
            bgcolor: "background.paper",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Image
              src={getAssetPrefix() + "icons/discover.svg"}
              alt="Search"
              width={20}
              height={20}
            />
            <Typography variant="h6">Saved Searches</Typography>
            <Chip
              label={filterSavedSearches(savedSearches).length}
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {(() => {
            const filteredSearches = filterSavedSearches(savedSearches);
            return savedSearches.length === 0 ? (
              <Typography color="text.secondary">
                No searches saved yet. Save searches from the discovery page to
                see them here.
              </Typography>
            ) : filteredSearches.length === 0 ? (
              <Typography color="text.secondary">
                No searches match your search criteria.
              </Typography>
            ) : (
              <Box>
                {filteredSearches.map((search) => {
                  // Extract up to 5 filters for display
                  const filterEntries = search.filters
                    ? Object.entries(search.filters)
                    : [];
                  const displayFilters = filterEntries.slice(0, 5);

                  return (
                    <Box key={search.id} sx={{ position: "relative", mb: 2 }}>
                      <Tooltip title="Click to re-run search">
                        <Card
                          sx={{
                            cursor: "pointer",
                            "&:hover": { bgcolor: "action.hover" },
                            p: 2,
                          }}
                          onClick={() => loadSearch(search)}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>
                              {search.query}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1 }}
                            >
                              {search.resultCount} results • Saved:{" "}
                              {search.created
                                ?.toDate?.()
                                ?.toLocaleDateString() || "Unknown"}
                            </Typography>
                            {displayFilters.length > 0 && (
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 0.5,
                                  mt: 1,
                                }}
                              >
                                {displayFilters.map(([key, values]) => (
                                  <Chip
                                    key={key}
                                    label={`${key}: ${
                                      Array.isArray(values)
                                        ? values.join(", ")
                                        : values
                                    }`}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      fontSize: {
                                        xs: "0.65rem",
                                        sm: "0.75rem",
                                      },
                                    }}
                                  />
                                ))}
                                {filterEntries.length > 5 && (
                                  <Chip
                                    label={`+${filterEntries.length - 5} more`}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      fontSize: "0.75rem",
                                      color: "text.secondary",
                                    }}
                                  />
                                )}
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Tooltip>
                      {/* Delete button overlay */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          zIndex: 1,
                        }}
                      >
                        <Tooltip title="Delete">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSavedSearch(search.id);
                            }}
                            startIcon={<Trash2 size={16} />}
                            sx={{
                              backgroundColor: "rgba(255, 255, 255, 0.9)",
                              color: "error.main",
                              borderColor: "error.main",
                              "&:hover": {
                                backgroundColor: "error.main",
                                color: "white",
                              },
                            }}
                          >
                            {!isMobile && "Delete"}
                          </Button>
                        </Tooltip>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            );
          })()}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
