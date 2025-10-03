"use client";

import {
  Box,
  Typography,
  Collapse,
  IconButton,
  CircularProgress,
} from "@mui/material";
import Image from "next/image";
import { ChevronDown, ChevronUp, Bookmark } from "lucide-react";
import { useState, memo, useMemo, useEffect, useRef } from "react";
import SquareChip from "@/components/SquareChip";
import DataCatalogCard from "@/components/DataCatalogCard";
import OrganizationCard from "@/components/OrganizationCard";
import TextWithLinkPreviews from "@/components/TextWithLinkPreviews";
import LinkPreviewCard from "@/components/LinkPreviewCard";
import dynamic from "next/dynamic";

// Dynamically import heavy data grid components to reduce initial bundle size
const MatchedVariablesDataGrid = dynamic(
  () => import("@/components/MatchedVariablesDataGrid"),
  {
    loading: () => <div>Loading variables...</div>,
  }
);
const ChildDatasetsDataGrid = dynamic(
  () => import("@/components/ChildDatasetsDataGrid"),
  {
    loading: () => <div>Loading datasets...</div>,
  }
);
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import { SearchResult, fetchResultByUuid } from "@/services/api";
import { useRouter, usePathname } from "next/navigation";

interface StudyDetailProps {
  study: SearchResult;
  isDrawerView?: boolean;
  studyDataComplete?: boolean;
}

const StudyDetailComponent = ({
  study,
  isDrawerView = false,
  studyDataComplete = false,
}: StudyDetailProps) => {
  // Client-side state
  const [variablesExpanded, setVariablesExpanded] = useState(false);
  const [additionalLinksExpanded, setAdditionalLinksExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedResourceId, setSavedResourceId] = useState<string | null>(null);
  const [instrumentsExpanded, setInstrumentsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    description: true,
    details: false,
    variables: false,
    links: false,
    childDatasets: false,
  });

  // Internal lookup state
  const [enhancedStudy, setEnhancedStudy] = useState<SearchResult | null>(null);
  const [isLoadingEnhancedData, setIsLoadingEnhancedData] = useState(false);

  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { currentUser } = useAuth();
  const { searchSettings, updateSearchSettings } = useSearch();
  const router = useRouter();
  const pathname = usePathname();

  // Track if we're on the client to avoid hydration mismatches
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Use enhanced study data if available, otherwise fall back to original study
  const displayStudy = enhancedStudy || study;

  // Reset enhanced study when the study prop changes
  useEffect(() => {
    setEnhancedStudy(null);
  }, [study.extra_data?.uuid]);

  // Helper function to add filter values additively
  const addToFilters = (filterKey: string, newValue: string) => {
    const currentFilters = searchSettings.selectedFilters;
    const currentValues = currentFilters[filterKey] || [];

    // Add the new value if it's not already present
    const updatedValues = currentValues.includes(newValue)
      ? currentValues
      : [...currentValues, newValue];

    updateSearchSettings({
      selectedFilters: {
        ...currentFilters,
        [filterKey]: updatedValues,
      },
    });

    // Navigate to discover page if we're not already there
    if (pathname !== "/discover") {
      router.push("/discover");
    }
  };

  // Extract data directly from SearchResult structure
  const title =
    displayStudy.dataset_schema?.name ||
    displayStudy.extra_data?.name ||
    "Untitled Dataset";
  const description =
    displayStudy.dataset_schema?.description ||
    displayStudy.extra_data?.description ||
    "";
  const aiSummary = displayStudy.extra_data?.ai_summary || null;
  const hasAiSummary = aiSummary && aiSummary.trim().length > 0;
  const currentDescription =
    showAiSummary && hasAiSummary ? aiSummary : description;

  // Extract image from SearchResult
  const image =
    (displayStudy.dataset_schema as any)?.image ||
    (displayStudy as any).image ||
    undefined;

  // Extract topics/keywords from SearchResult
  const unfilteredTopics = displayStudy.dataset_schema?.keywords || [];
  const filteredTopics = unfilteredTopics.filter(
    (topic: any) =>
      typeof topic === "string" &&
      !topic.includes("<a title=") &&
      !topic.startsWith("<")
  );

  // Format temporal coverage to display nicely
  const formatTemporalCoverage = (coverage?: string) => {
    if (!coverage) return "Not specified";

    // Handle the "YYYY..YYYY" format
    if (coverage.includes("..")) {
      const [start, end] = coverage.split("..");
      if (!end) return `${start} - Present (Ongoing)`;
      return `${start} - ${end}`;
    }

    return coverage;
  };

  // Check if there are any items to show
  const hasTopics = filteredTopics.length > 0;
  const hasInstruments =
    (displayStudy.extra_data?.instruments || []).length > 0;
  const hasVariables =
    (displayStudy.variables_which_matched || []).length > 0 ||
    (displayStudy.dataset_schema?.variableMeasured || []).length > 0 ||
    (displayStudy.dataset_schema?.number_of_variables || 0) > 0;

  // Extract additional links from identifiers and url fields
  const additionalLinks: string[] = [];
  if (
    displayStudy.dataset_schema?.identifier &&
    Array.isArray(displayStudy.dataset_schema.identifier)
  ) {
    const validUrls = displayStudy.dataset_schema.identifier
      .filter((id) => {
        if (id.startsWith("http://") || id.startsWith("https://")) return true;
        if (id.startsWith("10.") && id.includes("/")) return true;
        return false;
      })
      .map((id) => {
        if (id.startsWith("10.") && id.includes("/")) {
          return `https://doi.org/${id}`;
        }
        return id;
      });
    additionalLinks.push(...validUrls);
  }
  if (
    displayStudy.dataset_schema?.url &&
    Array.isArray(displayStudy.dataset_schema.url)
  ) {
    additionalLinks.push(...displayStudy.dataset_schema.url);
  }
  const hasAdditionalLinks = additionalLinks.length > 0;

  // Client-side effects
  useEffect(() => {
    setImageError(false);
  }, [displayStudy.dataset_schema?.name, displayStudy.extra_data?.name]);

  useEffect(() => {
    setDescriptionExpanded(false);
  }, [displayStudy.dataset_schema?.name, displayStudy.extra_data?.name]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [displayStudy.extra_data?.uuid]);

  useEffect(() => {
    const checkIfSaved = async () => {
      if (!currentUser || !displayStudy.extra_data?.uuid) return;

      try {
        // Dynamic import for client-side only
        const { collection, query, where, getDocs } = await import(
          "firebase/firestore/lite"
        );
        const { db } = await import("../firebase");

        const q = query(
          collection(db, "saved_resources"),
          where("uid", "==", currentUser.uid),
          where("uuid", "==", displayStudy.extra_data.uuid)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setIsSaved(true);
          setSavedResourceId(doc.id);
        } else {
          setIsSaved(false);
          setSavedResourceId(null);
        }
      } catch (error) {
        console.error("Error checking if resource is saved:", error);
      }
    };

    checkIfSaved();
  }, [currentUser, displayStudy.extra_data?.uuid]);

  const toggleSave = async () => {
    if (!currentUser || !displayStudy.extra_data?.uuid || saving) return;

    setSaving(true);
    try {
      // Dynamic import for client-side only
      const {
        collection,
        addDoc,
        serverTimestamp,
        query,
        where,
        getDocs,
        deleteDoc,
        doc,
      } = await import("firebase/firestore/lite");
      const { db } = await import("../firebase");

      if (isSaved && savedResourceId) {
        await deleteDoc(doc(db, "saved_resources", savedResourceId));
        setIsSaved(false);
        setSavedResourceId(null);
      } else {
        const title =
          displayStudy.dataset_schema?.name ||
          displayStudy.extra_data?.name ||
          "Untitled Dataset";
        const description =
          displayStudy.extra_data?.ai_summary ||
          displayStudy.dataset_schema?.description ||
          displayStudy.extra_data?.description ||
          "";
        const image =
          (displayStudy.dataset_schema as any)?.image ||
          (displayStudy as any).image ||
          null;
        const aiSummary = displayStudy.extra_data?.ai_summary || null;

        const resourceData = {
          title: title,
          description: aiSummary || description,
          image: image || null,
          uuid: displayStudy.extra_data.uuid,
          slug: displayStudy.extra_data.slug || null,
          resourceType: displayStudy.extra_data.resource_type || null,
          keywords: displayStudy.dataset_schema?.keywords || [],
          variablesCount:
            displayStudy.dataset_schema?.variableMeasured?.length ||
            displayStudy.dataset_schema?.number_of_variables ||
            0,
          datasetsCount: displayStudy.child_datasets?.length || 0,
          hasDataAvailable:
            !!displayStudy.dataset_schema?.includedInDataCatalog?.length,
          hasFreeAccess: displayStudy.hasFreeAccess || false,
          hasCohortsAvailable: displayStudy.hasCohortsAvailable || false,
          uid: currentUser.uid,
          created: serverTimestamp(),
        };

        const docRef = await addDoc(
          collection(db, "saved_resources"),
          resourceData
        );
        setIsSaved(true);
        setSavedResourceId(docRef.id);
      }
    } catch (error) {
      console.error("Error saving/unsaving resource:", error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const hasAiSummary = !!(
      displayStudy.extra_data?.ai_summary &&
      displayStudy.extra_data.ai_summary.trim().length > 0
    );
    setShowAiSummary(hasAiSummary);
  }, [
    displayStudy.dataset_schema?.name,
    displayStudy.extra_data?.name,
    displayStudy.extra_data?.ai_summary,
  ]);

  useEffect(() => {
    let cancelled = false;
    setEnhancedStudy(null);

    if (studyDataComplete) {
      return;
    }
    if (!displayStudy?.extra_data?.uuid) {
      return;
    }

    setIsLoadingEnhancedData(true);

    const fetchData = async () => {
      try {
        const enhancedData = await fetchResultByUuid(
          displayStudy.extra_data.uuid!,
          searchSettings.query,
          searchSettings.hybridWeight,
          searchSettings.maxDistance
        );

        if (!cancelled) {
          setEnhancedStudy(enhancedData);
          setIsLoadingEnhancedData(false);
        }
      } catch (error) {
        console.error("Failed to load enhanced study data:", error);
        if (!cancelled) {
          setIsLoadingEnhancedData(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [
    displayStudy?.extra_data?.uuid,
    studyDataComplete,
    searchSettings.query,
    searchSettings.hybridWeight,
    searchSettings.maxDistance,
  ]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Prepare deduped list of all variables for the DataGrid
  const allStudyVariables = useMemo(() => {
    const matched = displayStudy.variables_which_matched || [];
    const allVars = displayStudy.dataset_schema?.variableMeasured || [];
    const matchedMap = new Map<string, any>();
    matched.forEach((v) => {
      const key = v.name;
      if (key) matchedMap.set(key, { ...v, matched: true });
    });
    allVars.forEach((v) => {
      const key = v.name;
      if (!key || matchedMap.has(key)) return;
      matchedMap.set(key, v);
    });
    return Array.from(matchedMap.values());
  }, [
    displayStudy.variables_which_matched,
    displayStudy.dataset_schema?.variableMeasured,
  ]);

  return (
    <Box
      ref={scrollContainerRef}
      sx={{
        p: 3,
        width: "100%",
        height: "100%",
        overflowY: "auto",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative", // For absolute positioning of loading indicator
      }}
    >
      {/* Loading indicator for enhanced data - absolutely positioned */}
      {isLoadingEnhancedData && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            p: 0.5,
            bgcolor: "background.paper",
            borderRadius: 1,
            boxShadow: 1,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <CircularProgress size={12} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: { xs: "0.6rem", sm: "0.7rem" },
            }}
          >
            Loading...
          </Typography>
        </Box>
      )}

      {/* Bookmark button for drawer mode */}
      {isDrawerView && currentUser && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <IconButton
            onClick={toggleSave}
            disabled={saving}
            sx={{
              color: isSaved ? "primary.main" : "text.secondary",
              "&:hover": {
                color: isSaved ? "primary.dark" : "primary.main",
              },
            }}
            title={isSaved ? "Remove from saved" : "Save to my resources"}
          >
            {saving ? (
              <CircularProgress size={20} />
            ) : (
              <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
            )}
          </IconButton>
        </Box>
      )}

      {/* Only show title in the detail view if not in drawer mode */}
      {!isDrawerView && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            mb: 4,
          }}
        >
          {/* Title and image inline */}
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h4" gutterBottom sx={{ flex: 1, mr: 1 }}>
                {title}
              </Typography>

              {/* Save button - only visible when user is logged in */}
              {currentUser && (
                <IconButton
                  onClick={toggleSave}
                  disabled={saving}
                  sx={{
                    color: isSaved ? "primary.main" : "text.secondary",
                    "&:hover": {
                      color: isSaved ? "primary.dark" : "primary.main",
                    },
                  }}
                  title={isSaved ? "Remove from saved" : "Save to my resources"}
                >
                  {saving ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Bookmark
                      size={20}
                      fill={isSaved ? "currentColor" : "none"}
                    />
                  )}
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Image beside the title if available */}
          {image && !imageError && (
            <Box
              sx={{
                width: 100,
                height: 100,
                position: "relative",
                borderRadius: "8px",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <Image
                key={title} // Force re-render when study changes
                src={image}
                alt={title}
                fill
                style={{ objectFit: "contain" }}
                onError={() => setImageError(true)}
                unoptimized={true}
              />
            </Box>
          )}
        </Box>
      )}

      {currentDescription && (
        <Box sx={{ mb: 4 }}>
          {descriptionExpanded ? (
            <TextWithLinkPreviews
              text={currentDescription}
              paragraphProps={{
                variant: "body1",
                sx: { mb: 2 },
              }}
              compact
            />
          ) : (
            <Typography
              variant="body1"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 5,
                WebkitBoxOrient: "vertical",
                mb: 2,
              }}
            >
              {currentDescription}
            </Typography>
          )}

          {/* AI Summary toggle link - only show if there's an AI summary */}
          {hasAiSummary && descriptionExpanded && (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography
                variant="body2"
                color="primary"
                sx={{
                  cursor: "pointer",
                  textDecoration: "underline",
                  "&:hover": { textDecoration: "none" },
                }}
                onClick={() => setShowAiSummary(!showAiSummary)}
              >
                {showAiSummary
                  ? "Showing AI summary, click to see original"
                  : "Showing original, click to see AI summary"}
              </Typography>
            </Box>
          )}
          {currentDescription.length > 300 && (
            <Box
              onClick={() => setDescriptionExpanded(!descriptionExpanded)}
              sx={{
                display: "flex",
                alignItems: "center",
                color: "primary.main",
                cursor: "pointer",
                mt: 1,
              }}
            >
              <Typography
                variant="body2"
                color="primary"
                sx={{ fontWeight: 500, mr: 1 }}
              >
                {descriptionExpanded ? "Show Less" : "Show More"}
              </Typography>
              {descriptionExpanded ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Variables section - moved up under description */}
      {hasVariables && (
        <Box sx={{ mb: 4 }}>
          <SquareChip
            fullWidth
            chipVariant="secondary"
            endIcon={
              variablesExpanded ? (
                <ChevronUp
                  size={16}
                  style={{ fill: "#004735", stroke: "none" }}
                />
              ) : (
                <ChevronDown
                  size={16}
                  style={{ fill: "#004735", stroke: "none" }}
                />
              )
            }
            sx={{ justifyContent: "space-between", py: 2, height: "auto" }}
            onClick={() => setVariablesExpanded(!variablesExpanded)}
          >
            {!displayStudy.variables_which_matched?.length
              ? `Variables (${
                  displayStudy.dataset_schema?.variableMeasured?.length ||
                  displayStudy.dataset_schema?.number_of_variables ||
                  0
                })`
              : `Related Variables (${
                  displayStudy.variables_which_matched.length
                } / ${
                  displayStudy.dataset_schema?.variableMeasured?.length ||
                  displayStudy.dataset_schema?.number_of_variables ||
                  0
                })`}
          </SquareChip>
          <Collapse in={variablesExpanded}>
            <Box
              sx={{
                p: 2,
                bgcolor: "rgba(0, 0, 0, 0.02)",
                borderRadius: 2,
                mb: 2,
              }}
            >
              <MatchedVariablesDataGrid
                variables={allStudyVariables}
                studyName={title}
              />
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Details section */}
      <Box sx={{ mb: 4 }}>
        <SquareChip
          fullWidth
          chipVariant="secondary"
          endIcon={
            expandedSections.details ? (
              <ChevronUp
                size={16}
                style={{ fill: "#004735", stroke: "none" }}
              />
            ) : (
              <ChevronDown
                size={16}
                style={{ fill: "#004735", stroke: "none" }}
              />
            )
          }
          sx={{ justifyContent: "space-between", py: 2, height: "auto" }}
          onClick={() => toggleSection("details")}
        >
          Details
        </SquareChip>
        <Collapse in={expandedSections.details}>
          <Box
            sx={{
              p: 2,
              bgcolor: "rgba(0, 0, 0, 0.02)",
              borderRadius: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {/* Publisher section - if available */}
              {study.dataset_schema?.publisher?.[0] && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2">Publisher:</Typography>
                  <OrganizationCard
                    name={
                      study.dataset_schema.publisher[0].name ||
                      "Unknown Publisher"
                    }
                    url={(study.dataset_schema.publisher[0] as any)?.url}
                    logo={(study.dataset_schema.publisher[0] as any)?.logo}
                  />
                </Box>
              )}

              {/* Geographic Coverage - only if available */}
              {(study.extra_data?.geographic_coverage ||
                study.extra_data?.country_codes) && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2">
                    Geographic Coverage:
                  </Typography>
                  <Typography>
                    {study.extra_data.geographic_coverage ||
                      study.extra_data.country_codes?.join(", ")}
                  </Typography>
                </Box>
              )}

              {/* Temporal Coverage - only if available */}
              {(study.dataset_schema?.temporalCoverage ||
                (study.extra_data?.start_year &&
                  study.extra_data?.end_year)) && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2">
                    Temporal Coverage:
                  </Typography>
                  <Typography>
                    {formatTemporalCoverage(
                      study.dataset_schema?.temporalCoverage ||
                        `${study.extra_data.start_year}..${study.extra_data.end_year}`
                    )}
                  </Typography>
                </Box>
              )}

              {/* Sample Size - only if available */}
              {study.extra_data?.sample_size && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2">Sample Size:</Typography>
                  <Typography>{study.extra_data.sample_size}</Typography>
                </Box>
              )}

              {/* Age Coverage - only if available */}
              {(study.extra_data?.age_lower || study.extra_data?.age_upper) && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2">Age Coverage:</Typography>
                  <Typography>
                    {study.extra_data.age_lower && study.extra_data.age_upper
                      ? `${study.extra_data.age_lower} - ${study.extra_data.age_upper} years`
                      : study.extra_data.age_lower
                      ? `${study.extra_data.age_lower}+ years`
                      : `0 - ${study.extra_data.age_upper} years`}
                  </Typography>
                </Box>
              )}

              {/* Resource Type - only if available */}
              {study.extra_data?.resource_type && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2">Resource Type:</Typography>
                  <Typography>{study.extra_data.resource_type}</Typography>
                </Box>
              )}

              {/* Study Design - only if available */}
              {study.extra_data?.study_design &&
                study.extra_data.study_design.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="subtitle2">Study Design:</Typography>
                    <Typography>
                      {study.extra_data.study_design.join(", ")}
                    </Typography>
                  </Box>
                )}
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* Funders section - only shown if funders exist */}
      {study.dataset_schema?.funder &&
        study.dataset_schema.funder.length > 0 && (
          <Box sx={{ mb: 4, flexShrink: 0 }}>
            <Typography variant="subtitle2" gutterBottom>
              Funders:
            </Typography>
            <Box
              sx={{
                display: "flex",
                overflowX: "auto",
                gap: 2,
                pb: 1, // Add padding to show scrollbar
                "&::-webkit-scrollbar": {
                  height: 6,
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(0,0,0,0.2)",
                  borderRadius: 3,
                },
              }}
            >
              {study.dataset_schema.funder.map((funder, index) => (
                <OrganizationCard
                  key={`${funder.name}-${index}`}
                  name={funder.name || "Funding Organization"}
                  url={(funder as any)?.url}
                  logo={(funder as any)?.logo}
                />
              ))}
            </Box>
          </Box>
        )}

      {/* Data Catalogs section - only shown if catalogs exist */}
      {study.dataset_schema?.includedInDataCatalog &&
        study.dataset_schema.includedInDataCatalog.length > 0 && (
          <Box sx={{ mb: 4, flexShrink: 0 }}>
            <Typography variant="subtitle2" gutterBottom>
              Available in Data Catalogs:
            </Typography>
            <Box
              sx={{
                display: "flex",
                overflowX: "auto",
                gap: 2,
                pb: 1, // Add padding to show scrollbar
                "&::-webkit-scrollbar": {
                  height: 6,
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(0,0,0,0.2)",
                  borderRadius: 3,
                },
              }}
            >
              {study.dataset_schema.includedInDataCatalog.map(
                (catalog, index) => (
                  <DataCatalogCard
                    key={`${catalog.name}-${index}`}
                    name={catalog.name || "Data Catalog"}
                    url={catalog.url}
                    logo={catalog.image}
                  />
                )
              )}
            </Box>
          </Box>
        )}
      {/* Topics section - only shown if topics exist */}
      {hasTopics && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" gutterBottom>
            Topics:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {filteredTopics.map((topic, index) => (
              <SquareChip
                key={`topic-${index}`}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  // Check if we're on the client side (context is available)
                  if (isClient) {
                    addToFilters("keywords", topic);
                  }
                }}
                sx={{ cursor: "pointer" }}
              >
                {topic}
              </SquareChip>
            ))}
          </Box>
        </Box>
      )}

      {/* Additional Links section - only shown if links exist */}
      {hasAdditionalLinks && (
        <Box sx={{ mb: 4, flexShrink: 0 }}>
          <SquareChip
            fullWidth
            chipVariant="secondary"
            endIcon={
              additionalLinksExpanded ? (
                <ChevronUp
                  size={16}
                  style={{ fill: "#004735", stroke: "none" }}
                />
              ) : (
                <ChevronDown
                  size={16}
                  style={{ fill: "#004735", stroke: "none" }}
                />
              )
            }
            sx={{
              justifyContent: "space-between",
              py: 2,
              height: "auto",
              mb: 2,
            }}
            onClick={() => setAdditionalLinksExpanded(!additionalLinksExpanded)}
          >
            Related Links & Papers
          </SquareChip>
          <Collapse in={additionalLinksExpanded}>
            {/* Only render link previews when section is expanded */}
            {additionalLinksExpanded && (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  mb: 2,
                  alignItems: "flex-start",
                }}
              >
                {additionalLinks?.map((link, index) => (
                  <Box
                    key={`link-${index}`}
                    sx={{ flex: "1 1 350px", minWidth: 300, maxWidth: 500 }}
                  >
                    <LinkPreviewCard url={link} />
                  </Box>
                ))}
              </Box>
            )}
          </Collapse>
        </Box>
      )}

      {/* Instruments section - only shown if instruments exist */}
      {hasInstruments && (
        <Box sx={{ mb: 2 }}>
          <SquareChip
            fullWidth
            chipVariant="secondary"
            endIcon={
              instrumentsExpanded ? (
                <ChevronUp
                  size={16}
                  style={{ fill: "#004735", stroke: "none" }}
                />
              ) : (
                <ChevronDown
                  size={16}
                  style={{ fill: "#004735", stroke: "none" }}
                />
              )
            }
            sx={{
              justifyContent: "space-between",
              py: 2,
              height: "auto",
              mb: 2,
            }}
            onClick={() => setInstrumentsExpanded(!instrumentsExpanded)}
          >
            Instruments ({(study.extra_data?.instruments || []).length})
          </SquareChip>
          <Collapse in={instrumentsExpanded}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
              {(study.extra_data?.instruments || []).map((instrument, idx) => (
                <SquareChip
                  key={`instrument-${idx}`}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    // Check if we're on the client side (context is available)
                    if (isClient) {
                      addToFilters("instruments", instrument);
                    }
                  }}
                  sx={{ cursor: "pointer" }}
                >
                  {instrument}
                </SquareChip>
              ))}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Child Datasets section - only if present */}
      {Array.isArray(study.child_datasets) &&
        (study.child_datasets || []).length > 0 && (
          <Box sx={{ mb: 4 }}>
            <SquareChip
              fullWidth
              chipVariant="secondary"
              endIcon={
                expandedSections.childDatasets ? (
                  <ChevronUp
                    size={16}
                    style={{ fill: "#004735", stroke: "none" }}
                  />
                ) : (
                  <ChevronDown
                    size={16}
                    style={{ fill: "#004735", stroke: "none" }}
                  />
                )
              }
              sx={{ justifyContent: "space-between", py: 2, height: "auto" }}
              onClick={() => toggleSection("childDatasets")}
            >
              Related Datasets ({(study.child_datasets || []).length})
            </SquareChip>
            <Collapse in={expandedSections.childDatasets}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "rgba(0, 0, 0, 0.02)",
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                <ChildDatasetsDataGrid datasets={study.child_datasets} />
              </Box>
            </Collapse>
          </Box>
        )}
    </Box>
  );
};

export default memo(StudyDetailComponent);
