"use client";

import { Box, CardContent, Typography, IconButton } from "@mui/material";
import { SearchResult } from "@/services/api";
import Image from "next/image";
import {
  File,
  Database,
  FileText,
  Book,
  ExternalLink,
  Bug,
} from "lucide-react";
import { useState } from "react";
import SquareChip from "@/components/SquareChip";
import JsonTreeDialog from "@/components/JsonTreeDialog";
import { getAssetPrefix } from "@/lib/utils/shared";

interface CompactResultCardProps {
  result: SearchResult;
  isSelected?: boolean;
  onClick?: () => void;
  onFindSimilar?: (result: SearchResult) => void;
}

export default function CompactResultCard({
  result: searchresult,
  isSelected,
  onClick,
  onFindSimilar,
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

  // Get the variables count from dataset_schema
  const variablesCount = result.dataset_schema?.number_of_variables || 0;
  const matchedVariablesCount = result.variables_which_matched?.length || 0;
  const hasVariables = variablesCount > 0;
  const hasMatchedVariables = matchedVariablesCount > 0;

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
  let imageUrl = null;
  const [imageError, setImageError] = useState(false);

  // Use the image directly from the result object if it exists
  if ((displayResult as any).dataset_schema?.image && !imageError) {
    imageUrl = (displayResult as any).dataset_schema.image;
  } else if ((displayResult as any).thumbnail && !imageError) {
    imageUrl = (displayResult as any).thumbnail;
  }

  // Fallback image based on resource type
  const getTypeIcon = () => {
    // Choose icon based on resource type
    if (resourceType.includes("dataset")) {
      return <Database size={48} />;
    } else if (resourceType.includes("variable")) {
      return <File size={48} />;
    } else if (resourceType.includes("study")) {
      return <Book size={48} />;
    } else {
      return <FileText size={48} />;
    }
  };

  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: "pointer",
        display: "flex",
        width: "100%",
        bgcolor: isSelected ? "rgba(25, 118, 210, 0.08)" : "transparent",
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
          py: 2, // Align with title
          flexShrink: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center", // Align to top
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
          getTypeIcon()
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
        {/* Find Similar Button */}
        <Box
          sx={{
            mt: 1,
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <SquareChip
            chipVariant="secondary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (result.extra_data?.uuid) {
                window.open(
                  `${getAssetPrefix()}discover?like=${result.extra_data.uuid}`,
                  "_blank"
                );
              }
            }}
            sx={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            Find Similar <ExternalLink size={14} style={{ marginLeft: 4 }} />
          </SquareChip>
        </Box>
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

          {/* Debug button - only visible in development */}
          {(true || process.env.NODE_ENV !== "production") && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setDebugDialogOpen(true);
              }}
              sx={{
                opacity: 0.6,
                "&:hover": { opacity: 1 },
                color: "text.secondary",
              }}
            >
              <Bug size={16} />
            </IconButton>
          )}
        </Box>

        {keywords.length > 0 && (
          <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
            {keywords.slice(0, 5).map((keyword: string, i: number) => (
              <Box key={`${keyword}-${i}`} component="span">
                <Box component="strong" sx={{ fontSize: "0.85rem" }}>
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
