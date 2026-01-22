"use client";

import {
  Box,
  CardContent,
  Typography,
  IconButton,
  Avatar,
} from "@mui/material";
import { SearchResult } from "@/services/api";
import Image from "next/image";
import { Database, Bug } from "lucide-react";
import { useState, useMemo } from "react";
import SquareChip from "@/components/SquareChip";
import JsonTreeDialog from "@/components/JsonTreeDialog";

interface CompactResultCardProps {
  result: SearchResult;
  isSelected?: boolean;
  onClick?: () => void;
  onFindSimilar?: (result: SearchResult) => void;
  onReportResult?: () => void;
}

export default function CompactResultCard({
  result: searchresult,
  isSelected,
  onClick,
  onFindSimilar,
  onReportResult,
}: CompactResultCardProps) {
  // If we have ancestors, we're showing the ancestor's card
  const isAncestorCard = Boolean(
    searchresult.ancestors && searchresult.ancestors.length > 0
  );
  const isVariableResult =
    searchresult.extra_data?.resource_type?.includes("variable");
  const isDatasetResult =
    searchresult.extra_data?.resource_type?.includes("dataset");

  // State for debug dialog
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);

  let result = searchresult;
  let displayResult = searchresult;
  if (isAncestorCard && searchresult.ancestors?.[0]) {
    // Use the top-level ancestor for display
    displayResult = searchresult.ancestors[0];
    // Keep the original result for buttons and description
    result = searchresult;
  }

  // Determine resource type from either dataset_schema.@type or resource_type
  const resourceType =
    displayResult?.extra_data?.resource_type ||
    (displayResult.dataset_schema && displayResult.dataset_schema["@type"]) ||
    "Unknown Resource Type";

  // Extract title, description, and keywords
  const title =
    displayResult.dataset_schema?.name ||
    displayResult.extra_data?.name ||
    "Unnamed Resource";
  const description =
    isAncestorCard && isDatasetResult
      ? result.dataset_schema?.description ||
        result.extra_data?.description ||
        ""
      : displayResult.dataset_schema?.description ||
        displayResult.extra_data?.description ||
        "";

  // Get keywords from either dataset_schema.keywords or result fields
  const unfilteredKeywords: string[] =
    displayResult.dataset_schema?.keywords ||
    (displayResult as any).topics ||
    [];

  // Filter out malformed keywords/topics that contain HTML fragments
  const keywords: string[] = unfilteredKeywords.filter(
    (keyword: any) =>
      typeof keyword === "string" &&
      !keyword.includes("<a title=") &&
      !keyword.startsWith("<")
  );

  // Get the variables count from multiple possible sources:
  // 1. extra_data.num_variables (from lookup API in trust estimate mode)
  // 2. extra_data.number_of_variables
  // 3. dataset_schema.number_of_variables
  // 4. dataset_schema.variableMeasured array length
  const variablesCount =
    result.extra_data?.num_variables ||
    result.extra_data?.number_of_variables ||
    result.dataset_schema?.number_of_variables ||
    result.dataset_schema?.variableMeasured?.length ||
    0;
  const matchedVariablesCount = result.variables_which_matched?.length || 0;
  const hasVariables = variablesCount > 0;
  const hasMatchedVariables = matchedVariablesCount > 0;

  // Get the datasets count from child_datasets
  const datasetsCount = result.child_datasets?.length || 0;
  const hasDatasets = datasetsCount > 0;

  // Check if data is available - Specifically when includedInDataCatalog exists
  const hasDataAvailable =
    result.dataset_schema?.includedInDataCatalog &&
    result.dataset_schema.includedInDataCatalog.length > 0;

  // Truncate description to 3-4 lines (approx 200 characters)
  const truncatedDescription =
    description.length > 200
      ? `${description.substring(0, 200)}...`
      : description;

  // Determine if result has image
  let imageUrl: string | null = null;
  const [imageError, setImageError] = useState(false);

  // Use the image directly from the result object if it exists
  if ((displayResult as any).dataset_schema?.image && !imageError) {
    imageUrl = (displayResult as any).dataset_schema.image;
  } else if ((displayResult as any).thumbnail && !imageError) {
    imageUrl = (displayResult as any).thumbnail;
  }

  // Utility function to get first letter, excluding "A" and "The" as first words
  const getFirstLetter = (text: string): string => {
    const trimmed = text.trim();
    if (!trimmed) return "?";

    // Remove "A " or "The " from the start (case-insensitive)
    const withoutPrefix = trimmed.replace(/^(A|The)\s+/i, "");
    const firstChar = withoutPrefix.charAt(0).toUpperCase();

    // Return the first letter, or fallback to original first letter if empty
    return firstChar || trimmed.charAt(0).toUpperCase() || "?";
  };

  // Hash function to generate consistent color from title
  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };

  // Generate a full RGB color from a hash value
  const hashToColor = (hash: number): string => {
    // Extract RGB components from different parts of the hash
    // Use modulo to ensure values are in valid range, but keep full range
    const r = (hash & 0xff0000) >> 16;
    const g = (hash & 0x00ff00) >> 8;
    const b = hash & 0x0000ff;

    // Ensure colors are not too dark (minimum 80) for better visibility
    // and not too light (maximum 220) for contrast with white text
    const adjustedR = Math.max(80, Math.min(220, r));
    const adjustedG = Math.max(80, Math.min(220, g));
    const adjustedB = Math.max(80, Math.min(220, b));

    return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
  };

  // Get avatar color and letter
  const avatarColor = useMemo(() => {
    const hash = hashString(title);
    return hashToColor(hash);
  }, [title]);

  const avatarLetter = useMemo(() => getFirstLetter(title), [title]);

  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: "pointer",
        display: "flex",
        width: "100%",
        bgcolor: isSelected ? "rgba(25, 118, 210, 0.08)" : "transparent",
        borderLeft: isSelected ? "3px solid" : "3px solid transparent",
        borderRight: isSelected ? "3px solid" : "3px solid transparent",
        borderColor: isSelected ? "primary.main" : "transparent",
        "&:hover": {
          bgcolor: isSelected
            ? "rgba(25, 118, 210, 0.12)"
            : "rgba(0, 0, 0, 0.02)",
        },
      }}
    >
      <Box
        sx={{
          width: 120,
          minHeight: "100%",
          py: 2,
          flexShrink: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          color: "grey.500",
          background: "transparent",
          position: "relative", // For badge positioning
        }}
      >
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={title}
            width={100}
            height={100}
            style={{ objectFit: "contain" }}
            onError={() => setImageError(true)}
            unoptimized={true}
          />
        ) : (
          <Avatar
            sx={{
              width: 60,
              height: 60,
              bgcolor: avatarColor,
              fontSize: "1.5rem",
              fontWeight: "bold",
            }}
          >
            {avatarLetter}
          </Avatar>
        )}
        {isAncestorCard && (
          <>
            {isVariableResult && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bgcolor: "primary.main",
                  color: "white",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                }}
              >
                V
              </Box>
            )}
            {isDatasetResult && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bgcolor: "primary.main",
                  color: "white",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                }}
              >
                <Database size={16} />
              </Box>
            )}
          </>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          p: 2,
          flex: 1,
          background: "transparent",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              mb: 0.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.2,
              flex: 1,
              mr: 1,
            }}
          >
            {title}
          </Typography>

          {/* Report/Debug button */}
          {(onReportResult ||
            true ||
            process.env.NODE_ENV !== "production") && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (onReportResult) {
                  onReportResult();
                } else {
                  setDebugDialogOpen(true);
                }
              }}
              sx={{
                opacity: 0.6,
                "&:hover": { opacity: 1 },
                color: "text.secondary",
              }}
              title={
                onReportResult ? "Report search result issue" : "Debug data"
              }
            >
              <Bug size={16} />
            </IconButton>
          )}
        </Box>

        {keywords.length > 0 && (
          <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
            {keywords.slice(0, 5).map((keyword: string, i: number) => (
              <Box key={`${keyword}-${i}`} component="span">
                <Box
                  component="strong"
                  sx={{
                    fontSize: { xs: "0.75rem", sm: "0.85rem" },
                  }}
                >
                  {keyword}
                </Box>
                {i < Math.min(keywords.length, 5) - 1 && (
                  <Box component="span" sx={{ mx: 0.5 }}>
                    •
                  </Box>
                )}
              </Box>
            ))}
          </Typography>
        )}

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.4,
            mb: 1.5,
          }}
        >
          {truncatedDescription}
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: "auto" }}>
          {isAncestorCard && isVariableResult ? (
            // When showing ancestor card for variable result, show the matching variable label
            <SquareChip
              key={result.extra_data?.uuid}
              chipVariant="primary"
              size="small"
            >
              {result.extra_data?.description || result.extra_data?.name}
            </SquareChip>
          ) : (
            // When showing regular card or dataset ancestor card, show normal chips
            <>
              {hasVariables && (
                <SquareChip chipVariant="primary" size="small">
                  {hasMatchedVariables
                    ? `Matched by variable`
                    : `${variablesCount} Variables`}
                </SquareChip>
              )}

              {hasDataAvailable && (
                <SquareChip chipVariant="secondary" size="small">
                  Data Available
                </SquareChip>
              )}

              {hasDatasets && (
                <SquareChip
                  chipVariant="secondary"
                  size="small"
                  sx={{
                    backgroundColor: "#444653",
                    color: "white",
                    "&:hover": {
                      backgroundColor: "#3a3d47",
                    },
                  }}
                >
                  {datasetsCount} Dataset{datasetsCount !== 1 ? "s" : ""}
                </SquareChip>
              )}

              {result.hasFreeAccess && (
                <SquareChip chipVariant="secondary" size="small">
                  Free Access
                </SquareChip>
              )}

              {result.hasCohortsAvailable && (
                <SquareChip chipVariant="secondary" size="small">
                  Cohorts Available
                </SquareChip>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Debug Dialog */}
      <JsonTreeDialog
        open={debugDialogOpen}
        onClose={() => setDebugDialogOpen(false)}
        data={result}
        title={`Debug: ${title}`}
      />
    </Box>
  );
}
