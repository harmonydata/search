"use client";

import {
  Box,
  Typography,
  Collapse,
  IconButton,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import Image from "next/image";
import { ChevronDown, ChevronUp, Bookmark, Info } from "lucide-react";
import { useState, memo, useMemo, useEffect, useRef } from "react";
import SquareChip from "@/components/SquareChip";
import DataCatalogCard from "@/components/DataCatalogCard";
import OrganizationCard from "@/components/OrganizationCard";
import TextWithLinkPreviews from "@/components/TextWithLinkPreviews";
import LinkPreviewCard from "@/components/LinkPreviewCard";
import ComingSoonDialog from "@/components/ComingSoonDialog";
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
import { useFirebase } from "@/contexts/FirebaseContext";
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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedResourceId, setSavedResourceId] = useState<string | null>(null);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  // Internal lookup state
  const [enhancedStudy, setEnhancedStudy] = useState<SearchResult | null>(null);
  const [isLoadingEnhancedData, setIsLoadingEnhancedData] = useState(false);
  
  // Store total variable count from API (when using server-side fetching)
  const [apiVariableCount, setApiVariableCount] = useState<number | null>(null);

  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { currentUser } = useAuth();
  const { checkIfResourceSaved, saveResource, unsaveResource } = useFirebase();
  const { searchSettings, updateSearchSettings } = useSearch();

  // Debounce search settings to avoid excessive API calls during typing
  const [debouncedQuery, setDebouncedQuery] = useState(searchSettings.query);
  const [debouncedHybridWeight, setDebouncedHybridWeight] = useState(
    searchSettings.hybridWeight
  );
  const [debouncedMaxDistance, setDebouncedMaxDistance] = useState(
    searchSettings.maxDistance
  );
  const router = useRouter();
  const pathname = usePathname();

  // Track if we're on the client to avoid hydration mismatches
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Use enhanced study data if available, otherwise fall back to original study
  // Preserve child_datasets from original study if enhanced study doesn't have them
  const displayStudy = enhancedStudy
    ? {
        ...enhancedStudy,
        child_datasets:
          enhancedStudy.child_datasets &&
          enhancedStudy.child_datasets.length > 0
            ? enhancedStudy.child_datasets
            : study.child_datasets,
      }
    : study;

  // Reset enhanced study when the study prop changes
  useEffect(() => {
    setEnhancedStudy(null);
    setApiVariableCount(null); // Reset variable count when study changes
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
  // Check if we have variables - either from API (study UUID) or from static data
  const hasVariables =
    !!displayStudy.extra_data?.uuid || // If we have UUID, API will fetch variables
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
        const result = await checkIfResourceSaved(
          currentUser.uid,
          displayStudy.extra_data.uuid
        );
        setIsSaved(result.isSaved);
        setSavedResourceId(result.resourceId || null);
      } catch (error) {
        console.error("Error checking if resource is saved:", error);
      }
    };

    checkIfSaved();
  }, [currentUser, displayStudy.extra_data?.uuid, checkIfResourceSaved]);

  const toggleSave = async () => {
    // For initial launch, show coming soon dialog instead of saving
    setComingSoonOpen(true);

    // Keep the original code commented for future use
    /*
    if (!currentUser || !displayStudy.extra_data?.uuid || saving) return;

    setSaving(true);
    try {
      if (isSaved && savedResourceId) {
        await unsaveResource(savedResourceId);
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
        };

        const resourceId = await saveResource(currentUser.uid, resourceData);
        setIsSaved(true);
        setSavedResourceId(resourceId);
      }
    } catch (error) {
      console.error("Error saving/unsaving resource:", error);
    } finally {
      setSaving(false);
    }
    */
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
          debouncedQuery,
          debouncedHybridWeight,
          debouncedMaxDistance
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
    debouncedQuery,
    debouncedHybridWeight,
    debouncedMaxDistance,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchSettings.query);
      setDebouncedHybridWeight(searchSettings.hybridWeight);
      setDebouncedMaxDistance(searchSettings.maxDistance);
    }, 800);

    return () => clearTimeout(timer);
  }, [
    searchSettings.query,
    searchSettings.hybridWeight,
    searchSettings.maxDistance,
  ]);

  const toggleSection = (section: string) => {
    // Accordions are always open, no-op
  };

  // Prepare deduped list of all variables for the DataGrid with repeat counts
  const { allStudyVariables, matchedCount, totalCount } = useMemo(() => {
    const matched = displayStudy.variables_which_matched || [];
    const allVars = displayStudy.dataset_schema?.variableMeasured || [];

    // First, dedupe all variables and track which ones are matched
    const variableMap = new Map<
      string,
      { variable: any; matched: boolean; repeatCount: number }
    >();

    // Count repeats within matched variables only
    const matchedCounts = new Map<string, number>();
    matched.forEach((v) => {
      const key = v.name;
      if (!key) return;
      matchedCounts.set(key, (matchedCounts.get(key) || 0) + 1);
    });

    // Process all variables, marking matched ones
    const processAllVariables = (variables: any[], isMatched: boolean) => {
      variables.forEach((v) => {
        const key = v.name;
        if (!key) return;

        const existing = variableMap.get(key);
        if (existing) {
          // Already exists, just update matched status if needed
          if (isMatched && !existing.matched) {
            existing.matched = true;
            existing.variable = { ...v, matched: true };
          }
        } else {
          // New variable
          const repeatCount = matchedCounts.get(key) || 1;
          variableMap.set(key, {
            variable: { ...v, matched: isMatched },
            matched: isMatched,
            repeatCount: repeatCount,
          });
        }
      });
    };

    // Process matched variables first (they take precedence)
    processAllVariables(matched, true);
    // Then process all variables
    processAllVariables(allVars, false);

    // Convert to array with display names
    const dedupedVariables = Array.from(variableMap.values()).map(
      ({ variable, repeatCount }) => ({
        ...variable,
        repeatCount: repeatCount,
        displayName:
          repeatCount > 1
            ? `${variable.name} (x${repeatCount})`
            : variable.name,
      })
    );

    const matchedCount = dedupedVariables.filter((v) => v.matched).length;
    const totalCount = dedupedVariables.length;

    return { allStudyVariables: dedupedVariables, matchedCount, totalCount };
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

      {/* Bookmark button for drawer mode - always visible */}
      {isDrawerView && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <IconButton
            onClick={toggleSave}
            disabled={saving}
            sx={{
              color: "text.secondary",
              "&:hover": {
                color: "primary.main",
              },
            }}
            title="Save to my resources"
          >
            <Bookmark size={20} fill="none" />
          </IconButton>
        </Box>
      )}
      <ComingSoonDialog
        open={comingSoonOpen}
        onClose={() => setComingSoonOpen(false)}
        featureName="Bookmark Study"
      />

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

              {/* Save button - always visible */}
              <IconButton
                onClick={toggleSave}
                disabled={saving}
                sx={{
                  color: "text.secondary",
                  "&:hover": {
                    color: "primary.main",
                  },
                }}
                title="Save to my resources"
              >
                <Bookmark size={20} fill="none" />
              </IconButton>
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
            sx={{ justifyContent: "space-between", py: 2, height: "auto" }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {displayStudy.extra_data?.uuid
                ? apiVariableCount !== null
                  ? `Variables (${apiVariableCount})`
                  : "Variables"
                : !matchedCount
                ? `Variables (${totalCount})`
                : `Related Variables (${matchedCount} / ${totalCount})`}
              <Tooltip title="This list is intended as an overview of variables and may not be comprehensive. Metadata is limited to information available from available sources. Always refer to source metadata.">
                <Info size={16} style={{ cursor: "help" }} />
              </Tooltip>
            </Box>
          </SquareChip>
          <Collapse in={true}>
            <Box
              sx={{
                p: 2,
                bgcolor: "rgba(0, 0, 0, 0.02)",
                borderRadius: 2,
                mb: 2,
              }}
            >
              <MatchedVariablesDataGrid
                variables={displayStudy.extra_data?.uuid ? undefined : allStudyVariables}
                studyName={title}
                studyUuid={displayStudy.extra_data?.uuid}
                studyAncestors={displayStudy.ancestors}
                query={debouncedQuery}
                variablesWhichMatched={displayStudy.variables_which_matched}
                alpha={debouncedHybridWeight}
                maxVectorDistance={debouncedMaxDistance}
                maxDistanceMode={searchSettings.maxDistanceMode}
                directMatchWeight={searchSettings.directMatchWeight}
                onTotalCountChange={setApiVariableCount}
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
          sx={{ justifyContent: "space-between", py: 2, height: "auto" }}
        >
          Details
        </SquareChip>
        <Collapse in={true}>
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
            sx={{
              justifyContent: "space-between",
              py: 2,
              height: "auto",
              mb: 2,
            }}
          >
            Related Links & Papers
          </SquareChip>
          <Collapse in={true}>
            {/* Only render link previews when section is expanded */}
            {true && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                  mb: 2,
                  "@media (max-width: 800px)": {
                    gridTemplateColumns: "1fr",
                  },
                }}
              >
                {additionalLinks
                  ?.filter((link) => link && link.trim() !== "") // Filter out empty strings
                  .map((link, index, filteredLinks) => {
                    const isLast = index === filteredLinks.length - 1;
                    const isOdd = filteredLinks.length % 2 !== 0;
                    const shouldSpanFull = isLast && isOdd;

                    return (
                      <Box
                        key={`link-${index}`}
                        sx={{
                          display: "flex",
                          gridColumn: shouldSpanFull ? "1 / -1" : "auto",
                        }}
                      >
                        <LinkPreviewCard url={link} />
                      </Box>
                    );
                  })}
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
            sx={{
              justifyContent: "space-between",
              py: 2,
              height: "auto",
              mb: 2,
            }}
          >
            Instruments ({(study.extra_data?.instruments || []).length})
          </SquareChip>
          <Collapse in={true}>
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
      {Array.isArray(displayStudy.child_datasets) &&
        (displayStudy.child_datasets || []).length > 0 && (
          <Box sx={{ mb: 4 }}>
            <SquareChip
              fullWidth
              chipVariant="secondary"
              sx={{ justifyContent: "space-between", py: 2, height: "auto" }}
            >
              Related Datasets ({(displayStudy.child_datasets || []).length})
            </SquareChip>
            <Collapse in={true}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "rgba(0, 0, 0, 0.02)",
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                <ChildDatasetsDataGrid datasets={displayStudy.child_datasets} />
              </Box>
            </Collapse>
          </Box>
        )}
    </Box>
  );
};

export default memo(StudyDetailComponent);
