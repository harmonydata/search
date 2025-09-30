"use client";

import {
  Box,
  Typography,
  Collapse,
  IconButton,
  CircularProgress,
} from "@mui/material";
import Image from "next/image";
import { ChevronDown, ChevronUp, Bug, Bookmark } from "lucide-react";
import { useState, memo, useMemo, useEffect } from "react";
import SquareChip from "@/components/SquareChip";
import DataCatalogCard from "@/components/DataCatalogCard";
import OrganizationCard from "@/components/OrganizationCard";
import TextWithLinkPreviews from "@/components/TextWithLinkPreviews";
import LinkPreviewCard from "@/components/LinkPreviewCard";
import MatchedVariablesDataGrid from "@/components/MatchedVariablesDataGrid";
import StudyDetailDebugDialog from "@/components/StudyDetailDebugDialog";
import ChildDatasetsDataGrid from "@/components/ChildDatasetsDataGrid";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore/lite";
import { db } from "../firebase";
import { fetchResultByUuid } from "@/services/api";
import { transformSearchResultToStudyDetail } from "@/lib/utils/studyTransform";

interface StudyDetailProps {
  study: {
    title: string;
    description: string;
    image?: string;
    uuid?: string;
    slug?: string;
    dataOwner?: {
      name: string;
      logo: string;
    };
    publisher?: {
      name: string;
      url?: string;
      logo?: string;
    };
    funders?: Array<{
      name: string;
      url?: string;
      logo?: string;
    }>;
    geographicCoverage?: string;
    temporalCoverage?: string;
    sampleSize?: string;
    ageCoverage?: string;
    studyDesign?: string[];
    resourceType?: string;
    topics?: string[];
    instruments?: string[];
    dataCatalogs?: Array<{
      name: string;
      url?: string;
      logo?: string;
    }>;
    matchedVariables?: Array<{
      name: string;
      description?: string;
      uuid?: string;
    }>;
    allVariables?: Array<{
      name: string;
      description?: string;
      uuid?: string;
    }>;
    additionalLinks?: string[];
    child_datasets?: Array<any>;
    aiSummary?: string | null;
  };
  isDrawerView?: boolean;
  isStudyPage?: boolean;
  onTopicClick?: (topic: string) => void;
  onInstrumentClick?: (instrument: string) => void;
  // Debug data - only available in development mode
  debugData?: {
    originalSearchResult?: any;
    lookupData?: any;
  };
  // Original search result containing dataset_schema
  originalSearchResult?: any;
  // Loading state for enhanced data
  isLoadingEnhancedData?: boolean;
}

const StudyDetailComponent = ({
  study,
  isDrawerView = false,
  onTopicClick,
  onInstrumentClick,
  debugData,
  originalSearchResult,
  isLoadingEnhancedData = false,
}: StudyDetailProps) => {
  const [variablesExpanded, setVariablesExpanded] = useState(false);
  const [additionalLinksExpanded, setAdditionalLinksExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedResourceId, setSavedResourceId] = useState<string | null>(null);

  // State for enhanced data loading
  const [enhancedStudy, setEnhancedStudy] = useState(study);
  const [isLoadingEnhanced, setIsLoadingEnhanced] = useState(
    isLoadingEnhancedData
  );
  const [enhancedDebugData, setEnhancedDebugData] = useState(debugData);

  const { currentUser } = useAuth();

  // Determine if we have AI summary available and what description to show
  const hasAiSummary =
    enhancedStudy.aiSummary && enhancedStudy.aiSummary.trim().length > 0;
  const currentDescription =
    showAiSummary && hasAiSummary
      ? enhancedStudy.aiSummary
      : enhancedStudy.description;

  // Reset image error when study changes or study image changes
  useEffect(() => {
    setImageError(false);
  }, [enhancedStudy.title, enhancedStudy.image]);

  // Reset description expanded state when study changes
  useEffect(() => {
    setDescriptionExpanded(false);
  }, [enhancedStudy.title]);

  // Check if resource is already saved
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!currentUser || !enhancedStudy.uuid) return;

      try {
        const q = query(
          collection(db, "saved_resources"),
          where("uid", "==", currentUser.uid),
          where("uuid", "==", enhancedStudy.uuid)
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
  }, [currentUser, enhancedStudy.uuid]);

  // Save/unsave resource
  const toggleSave = async () => {
    if (!currentUser || !enhancedStudy.uuid || saving) return;

    setSaving(true);
    try {
      if (isSaved && savedResourceId) {
        // Unsave
        await deleteDoc(doc(db, "saved_resources", savedResourceId));
        setIsSaved(false);
        setSavedResourceId(null);
      } else {
        // Save
        const resourceData = {
          title: enhancedStudy.title,
          description: enhancedStudy.aiSummary || enhancedStudy.description,
          image: enhancedStudy.image || null,
          uuid: enhancedStudy.uuid,
          slug: enhancedStudy.slug || null,
          resourceType: enhancedStudy.resourceType || null,
          // Data for CompactResultCard display - use merged data from lookup
          keywords: (enhancedStudy as any).topics || [],
          variablesCount:
            (enhancedStudy as any).allVariables?.length ||
            (enhancedStudy as any).dataset_schema?.number_of_variables ||
            (enhancedStudy as any).dataset_schema?.variableMeasured?.length ||
            0,
          datasetsCount: (enhancedStudy as any).child_datasets?.length || 0,
          hasDataAvailable: !!(enhancedStudy as any).dataset_schema
            ?.includedInDataCatalog?.length,
          hasFreeAccess: (enhancedStudy as any).hasFreeAccess || false,
          hasCohortsAvailable:
            (enhancedStudy as any).hasCohortsAvailable || false,
          // User and metadata
          uid: currentUser.uid,
          created: serverTimestamp(),
        };

        console.log("Saving resource:", resourceData);

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

  // Reset AI summary toggle when study changes - default to AI summary if available
  useEffect(() => {
    setShowAiSummary(!!hasAiSummary);
  }, [enhancedStudy.title, hasAiSummary]);

  // Load enhanced data for statically rendered pages
  useEffect(() => {
    let cancelled = false;

    async function loadEnhancedDetail() {
      if (!isLoadingEnhancedData || !originalSearchResult?.extra_data?.uuid) {
        return;
      }

      try {
        setIsLoadingEnhanced(true);

        // Fetch the full detail from the backend
        const calculatedAlpha = 0.5; // Default balanced weight for static pages
        const fullResult = await fetchResultByUuid(
          originalSearchResult.extra_data.uuid,
          "", // No search query for static pages
          calculatedAlpha,
          0.4 // Default max distance
        );

        // Preserve the matched variables and child datasets from the lookup result
        if (
          !fullResult.variables_which_matched &&
          originalSearchResult.variables_which_matched
        ) {
          fullResult.variables_which_matched =
            originalSearchResult.variables_which_matched;
        }
        if (
          !fullResult.child_datasets &&
          originalSearchResult.datasets_which_matched
        ) {
          fullResult.child_datasets =
            originalSearchResult.datasets_which_matched;
        }

        const enhancedDetail = transformSearchResultToStudyDetail(fullResult);

        // Store enhanced debug data
        const enhancedDebugData =
          true || process.env.NODE_ENV !== "production"
            ? {
                originalSearchResult: originalSearchResult,
                lookupData: fullResult,
              }
            : undefined;

        if (!cancelled) {
          setEnhancedStudy(enhancedDetail);
          setEnhancedDebugData(enhancedDebugData);
          setIsLoadingEnhanced(false);
        }
      } catch (error) {
        console.error("Failed to load enhanced study detail:", error);
        if (!cancelled) {
          setIsLoadingEnhanced(false);
        }
      }
    }

    loadEnhancedDetail();

    return () => {
      cancelled = true;
    };
  }, [isLoadingEnhancedData, originalSearchResult]);

  // State for debug dialog
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);

  // Add state for instruments dropdown
  const [instrumentsExpanded, setInstrumentsExpanded] = useState(false);

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    description: true,
    details: false,
    variables: false,
    links: false,
    childDatasets: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Filter out malformed keywords/topics that contain HTML fragments
  const filteredTopics = (enhancedStudy.topics || []).filter(
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
  const hasInstruments = (enhancedStudy.instruments || []).length > 0;
  const hasVariables =
    (enhancedStudy.matchedVariables || []).length > 0 ||
    (enhancedStudy.allVariables || []).length > 0;
  const hasAdditionalLinks = (enhancedStudy.additionalLinks || []).length > 0;

  // Debug log for instruments
  console.log("StudyDetail instruments debug:", {
    instruments: enhancedStudy.instruments || [],
    hasInstruments,
    instrumentsLength: (enhancedStudy.instruments || []).length,
  });

  // Prepare deduped list of all variables for the DataGrid
  const allStudyVariables = useMemo(() => {
    console.log("study var deduping :", {
      matchedVariables: enhancedStudy.matchedVariables,
      allVariables: enhancedStudy.allVariables,
      matchedLength: enhancedStudy.matchedVariables?.length,
      allLength: enhancedStudy.allVariables?.length,
    });
    const matched = enhancedStudy.matchedVariables || [];
    const allVars = enhancedStudy.allVariables || [];
    // Use uuid if present, else name as key
    const matchedMap = new Map<string, any>();
    matched.forEach((v) => {
      const key = v.uuid || v.name;
      if (key) matchedMap.set(key, { ...v, matched: true });
    });
    // Add unmatched variables
    allVars.forEach((v) => {
      const key = v.uuid || v.name;
      if (!key || matchedMap.has(key)) return;
      matchedMap.set(key, v);
    });
    // Return as array
    return Array.from(matchedMap.values());
  }, [enhancedStudy.matchedVariables, enhancedStudy.allVariables]);

  return (
    <Box
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
      {isLoadingEnhanced && (
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

      {/* Debug button for drawer mode - only visible in development */}
      {isDrawerView && (true || process.env.NODE_ENV !== "production") && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <IconButton
            size="small"
            onClick={() => setDebugDialogOpen(true)}
            sx={{
              opacity: 0.6,
              "&:hover": { opacity: 1 },
              color: "text.secondary",
            }}
          >
            <Bug size={18} />
          </IconButton>
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
                {enhancedStudy.title}
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

              {/* Debug button - only visible in development */}
              {(true || process.env.NODE_ENV !== "production") && (
                <IconButton
                  size="small"
                  onClick={() => setDebugDialogOpen(true)}
                  sx={{
                    opacity: 0.6,
                    "&:hover": { opacity: 1 },
                    color: "text.secondary",
                    mt: 0.5,
                  }}
                >
                  <Bug size={18} />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Image beside the title if available */}
          {enhancedStudy.image && !imageError && (
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
                key={enhancedStudy.title} // Force re-render when study changes
                src={enhancedStudy.image}
                alt={enhancedStudy.title}
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
          {/* Toggle between AI Summary and Original Description */}
          {hasAiSummary && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 2,
                p: 1,
                bgcolor: "rgba(0, 0, 0, 0.02)",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Description:
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: !showAiSummary ? "primary.main" : "text.secondary",
                    fontWeight: !showAiSummary ? 600 : 400,
                    cursor: "pointer",
                  }}
                  onClick={() => setShowAiSummary(false)}
                >
                  Original
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  |
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: showAiSummary ? "primary.main" : "text.secondary",
                    fontWeight: showAiSummary ? 600 : 400,
                    cursor: "pointer",
                  }}
                  onClick={() => setShowAiSummary(true)}
                >
                  AI Summary
                </Typography>
              </Box>
            </Box>
          )}

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
            {enhancedStudy.matchedVariables?.length === 0
              ? `Variables (${enhancedStudy.allVariables?.length || 0})`
              : `Related Variables (${
                  enhancedStudy.matchedVariables?.length || 0
                } / ${enhancedStudy.allVariables?.length || 0})`}
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
                studyName={enhancedStudy.title}
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
              {enhancedStudy.publisher && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2">Publisher:</Typography>
                  <OrganizationCard
                    name={enhancedStudy.publisher.name}
                    url={enhancedStudy.publisher.url}
                    logo={enhancedStudy.publisher.logo}
                  />
                </Box>
              )}

              {/* Geographic Coverage - only if available */}
              {enhancedStudy.geographicCoverage && (
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
                  <Typography>{enhancedStudy.geographicCoverage}</Typography>
                </Box>
              )}

              {/* Temporal Coverage - only if available */}
              {enhancedStudy.temporalCoverage && (
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
                    {formatTemporalCoverage(enhancedStudy.temporalCoverage)}
                  </Typography>
                </Box>
              )}

              {/* Sample Size - only if available */}
              {enhancedStudy.sampleSize &&
                enhancedStudy.sampleSize !== "Not specified" && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="subtitle2">Sample Size:</Typography>
                    <Typography>{enhancedStudy.sampleSize}</Typography>
                  </Box>
                )}

              {/* Age Coverage - only if available */}
              {enhancedStudy.ageCoverage && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2">Age Coverage:</Typography>
                  <Typography>{enhancedStudy.ageCoverage}</Typography>
                </Box>
              )}

              {/* Resource Type - only if available */}
              {enhancedStudy.resourceType && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2">Resource Type:</Typography>
                  <Typography>{enhancedStudy.resourceType}</Typography>
                </Box>
              )}

              {/* Study Design - only if available */}
              {enhancedStudy.studyDesign &&
                enhancedStudy.studyDesign.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="subtitle2">Study Design:</Typography>
                    <Typography>
                      {enhancedStudy.studyDesign.join(", ")}
                    </Typography>
                  </Box>
                )}
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* Funders section - only shown if funders exist */}
      {(enhancedStudy.funders || []).length > 0 && (
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
            {(enhancedStudy.funders || []).map((funder, index) => (
              <OrganizationCard
                key={`${funder.name}-${index}`}
                name={funder.name}
                url={funder.url}
                logo={funder.logo}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Data Catalogs section - only shown if catalogs exist */}
      {(enhancedStudy.dataCatalogs || []).length > 0 && (
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
            {(enhancedStudy.dataCatalogs || []).map((catalog, index) => (
              <DataCatalogCard
                key={`${catalog.name}-${index}`}
                name={catalog.name}
                url={catalog.url}
                logo={catalog.logo}
              />
            ))}
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
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTopicClick) {
                    onTopicClick(topic);
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
                {enhancedStudy.additionalLinks?.map((link, index) => (
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
            onClick={() => setInstrumentsExpanded((prev) => !prev)}
          >
            Instruments ({(enhancedStudy.instruments || []).length})
          </SquareChip>
          <Collapse in={instrumentsExpanded}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
              {(enhancedStudy.instruments || []).map((instrument, idx) => (
                <SquareChip
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onInstrumentClick) {
                      onInstrumentClick(instrument);
                    }
                  }}
                  key={`instrument-${idx}`}
                >
                  {instrument}
                </SquareChip>
              ))}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Child Datasets section - only if present */}
      {Array.isArray(enhancedStudy.child_datasets) &&
        (enhancedStudy.child_datasets || []).length > 0 && (
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
              Related Datasets ({(enhancedStudy.child_datasets || []).length})
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
                <ChildDatasetsDataGrid
                  datasets={enhancedStudy.child_datasets}
                />
              </Box>
            </Collapse>
          </Box>
        )}

      {/* Debug Dialog */}
      <StudyDetailDebugDialog
        open={debugDialogOpen}
        onClose={() => setDebugDialogOpen(false)}
        title={enhancedStudy.title}
        originalSearchResult={enhancedDebugData?.originalSearchResult}
        lookupData={enhancedDebugData?.lookupData}
        finalProcessedData={enhancedStudy}
      />
    </Box>
  );
};

export default memo(StudyDetailComponent);
