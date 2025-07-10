"use client";

import { Box, Typography, Collapse, IconButton } from "@mui/material";
import Image from "next/image";
import { ChevronDown, ChevronUp, Bug } from "lucide-react";
import { useState, memo, useMemo, useEffect } from "react";
import SquareChip from "@/components/SquareChip";
import DataCatalogCard from "@/components/DataCatalogCard";
import OrganizationCard from "@/components/OrganizationCard";
import TextWithLinkPreviews from "@/components/TextWithLinkPreviews";
import LinkPreviewCard from "@/components/LinkPreviewCard";
import MatchedVariablesDataGrid from "@/components/MatchedVariablesDataGrid";
import StudyDetailDebugDialog from "@/components/StudyDetailDebugDialog";
import ChildDatasetCard from "@/components/ChildDatasetCard";

interface StudyDetailProps {
  study: {
    title: string;
    description: string;
    image?: string;
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
    topics: string[];
    instruments: string[];
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
}

const StudyDetailComponent = ({
  study,
  isDrawerView = false,
  onTopicClick,
  onInstrumentClick,
  debugData,
}: StudyDetailProps) => {
  const [variablesExpanded, setVariablesExpanded] = useState(false);
  const [aiSummaryExpanded, setAiSummaryExpanded] = useState(false);
  const [additionalLinksExpanded, setAdditionalLinksExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image error when study image changes
  useEffect(() => {
    setImageError(false);
  }, [study.image]);

  // State for debug dialog
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);

  // Add state for instruments dropdown
  const [instrumentsExpanded, setInstrumentsExpanded] = useState(false);

  // Filter out malformed keywords/topics that contain HTML fragments
  const filteredTopics = study.topics.filter(
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
  const hasInstruments = study.instruments && study.instruments.length > 0;
  const hasVariables =
    (study.matchedVariables && study.matchedVariables.length > 0) ||
    (study.allVariables && study.allVariables.length > 0);
  const hasAdditionalLinks =
    study.additionalLinks && study.additionalLinks.length > 0;

  // Debug log for instruments
  console.log("StudyDetail instruments debug:", {
    instruments: study.instruments,
    hasInstruments,
    instrumentsLength: study.instruments?.length,
  });

  // Prepare deduped list of all variables for the DataGrid
  const allStudyVariables = useMemo(() => {
    console.log("study var deduping :", study.matchedVariables, study);
    const matched = study.matchedVariables || [];
    const allVars = study.allVariables || [];
    // Use uuid if present, else name as key
    const matchedMap = new Map<string, any>();
    matched.forEach((v) => {
      const key = v.uuid || v.name;
      if (key) matchedMap.set(key, v);
    });
    // Add unmatched variables
    allVars.forEach((v) => {
      const key = v.uuid || v.name;
      if (!key || matchedMap.has(key)) return;
      matchedMap.set(key, v);
    });
    // Return as array
    return Array.from(matchedMap.values());
  }, [study.matchedVariables, study.allVariables]);

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
      }}
    >
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
                {study.title}
              </Typography>

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
          {study.image && !imageError && (
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
                src={study.image}
                alt={study.title}
                fill
                style={{ objectFit: "contain" }}
                onError={() => setImageError(true)}
                unoptimized={true}
              />
            </Box>
          )}
        </Box>
      )}

      {study.description && (
        <Box sx={{ mb: 4 }}>
          <Collapse in={descriptionExpanded} collapsedSize="130px">
            {" "}
            {/* ~5 lines at default font size */}
            <TextWithLinkPreviews
              text={study.description}
              paragraphProps={{
                variant: "body1",
                sx: { mb: 2 },
              }}
              compact
            />
          </Collapse>
          {study.description.length > 300 && (
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

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          mb: 4,
        }}
      >
        {/* Publisher section - if available */}
        {study.publisher && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2">Publisher:</Typography>
            <OrganizationCard
              name={study.publisher.name}
              url={study.publisher.url}
              logo={study.publisher.logo}
            />
          </Box>
        )}

        {/* Geographic Coverage - only if available */}
        {study.geographicCoverage && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2">Geographic Coverage:</Typography>
            <Typography>{study.geographicCoverage}</Typography>
          </Box>
        )}

        {/* Temporal Coverage - only if available */}
        {study.temporalCoverage && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2">Temporal Coverage:</Typography>
            <Typography>
              {formatTemporalCoverage(study.temporalCoverage)}
            </Typography>
          </Box>
        )}

        {/* Sample Size - only if available */}
        {study.sampleSize && study.sampleSize !== "Not specified" && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2">Sample Size:</Typography>
            <Typography>{study.sampleSize}</Typography>
          </Box>
        )}

        {/* Age Coverage - only if available */}
        {study.ageCoverage && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2">Age Coverage:</Typography>
            <Typography>{study.ageCoverage}</Typography>
          </Box>
        )}

        {/* Resource Type - only if available */}
        {study.resourceType && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2">Resource Type:</Typography>
            <Typography>{study.resourceType}</Typography>
          </Box>
        )}

        {/* Study Design - only if available */}
        {study.studyDesign && study.studyDesign.length > 0 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2">Study Design:</Typography>
            <Typography>{study.studyDesign.join(", ")}</Typography>
          </Box>
        )}
      </Box>

      {/* Funders section - only shown if funders exist */}
      {study.funders && study.funders.length > 0 && (
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
            {study.funders.map((funder, index) => (
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
      {study.dataCatalogs && study.dataCatalogs.length > 0 && (
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
            {study.dataCatalogs.map((catalog, index) => (
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
                {study.additionalLinks?.map((link, index) => (
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
            Instruments ({study.instruments.length})
          </SquareChip>
          <Collapse in={instrumentsExpanded}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
              {study.instruments.map((instrument, idx) => (
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
      {Array.isArray(study.child_datasets) &&
        study.child_datasets.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom>
              Child Datasets:
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                alignItems: "stretch",
              }}
            >
              {study.child_datasets.map((ds: any, idx: number) => (
                <ChildDatasetCard
                  key={ds.extra_data?.uuid || idx}
                  dataset={ds}
                />
              ))}
            </Box>
          </Box>
        )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <SquareChip
          fullWidth
          chipVariant="secondary"
          endIcon={
            aiSummaryExpanded ? (
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
          onClick={() => setAiSummaryExpanded(!aiSummaryExpanded)}
        >
          AI Summary
        </SquareChip>
        <Collapse in={aiSummaryExpanded}>
          <Box
            sx={{
              p: 2,
              bgcolor: "rgba(0, 0, 0, 0.02)",
              borderRadius: 2,
              mb: 2,
            }}
          >
            <Typography>AI summary not available yet.</Typography>
          </Box>
        </Collapse>

        {/* Only show the variables section if we have variables */}
        {hasVariables && (
          <>
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
              Related Variables found within study
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
                {/* Show all variables (matched and unmatched, deduped) */}
                <MatchedVariablesDataGrid
                  variables={allStudyVariables}
                  studyName={study.title}
                />
              </Box>
            </Collapse>
          </>
        )}
      </Box>

      {/* Debug Dialog */}
      <StudyDetailDebugDialog
        open={debugDialogOpen}
        onClose={() => setDebugDialogOpen(false)}
        title={study.title}
        originalSearchResult={debugData?.originalSearchResult}
        lookupData={debugData?.lookupData}
        finalProcessedData={study}
      />
    </Box>
  );
};

export default memo(StudyDetailComponent);
