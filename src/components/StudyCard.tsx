"use client";

import { useState } from "react";
import { Box, Typography, Card, CardContent, Chip } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { SearchResult } from "@/services/api";
import { Database, Book, FileText } from "lucide-react";

interface StudyCardProps {
  study: SearchResult;
}

export default function StudyCard({ study }: StudyCardProps) {
  const [imageError, setImageError] = useState(false);

  const title =
    study.dataset_schema?.name || study.extra_data?.name || "Untitled Study";
  const description =
    study.dataset_schema?.description || study.extra_data?.description || "";
  const slug = study.extra_data?.slug;
  const resourceType =
    study.extra_data?.resource_type || study.dataset_schema?.["@type"] || "";
  const numberOfVariables = study.dataset_schema?.number_of_variables;
  const countryCodes = study.extra_data?.country_codes;
  const studyDesign = study.extra_data?.study_design;

  // Get image URL
  let imageUrl = null;
  if ((study.dataset_schema as any)?.image && !imageError) {
    imageUrl = (study.dataset_schema as any).image;
  } else if ((study as any).image && !imageError) {
    imageUrl = (study as any).image;
  }

  // Get publisher info
  const publisher = study.dataset_schema?.publisher?.[0]?.name;

  // Get data catalog info
  const dataCatalog = study.dataset_schema?.includedInDataCatalog?.[0]?.name;

  // Fallback icon
  const getTypeIcon = () => {
    if (resourceType.includes("dataset")) {
      return <Database size={64} />;
    } else if (resourceType.includes("study")) {
      return <Book size={64} />;
    } else {
      return <FileText size={64} />;
    }
  };

  // Truncate description
  const truncatedDescription =
    description.length > 200
      ? `${description.substring(0, 200)}...`
      : description;

  const cardContent = (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: slug ? "pointer" : "default",
        "&:hover": slug
          ? {
              boxShadow: 4,
              transform: "translateY(-2px)",
            }
          : {},
        transition: "all 0.2s ease-in-out",
      }}
    >
      {/* Image Section */}
      <Box
        sx={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.50",
          borderBottom: "1px solid",
          borderColor: "grey.200",
        }}
      >
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={title}
            width={180}
            height={180}
            style={{ objectFit: "contain", maxHeight: "180px" }}
            onError={() => setImageError(true)}
            unoptimized={true}
          />
        ) : (
          <Box sx={{ color: "grey.400" }}>{getTypeIcon()}</Box>
        )}
      </Box>

      <CardContent
        sx={{ flex: 1, display: "flex", flexDirection: "column", p: 3 }}
      >
        {/* Title */}
        <Typography
          variant="h6"
          component="h2"
          gutterBottom
          sx={{
            fontWeight: 600,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            minHeight: "2.4em",
          }}
        >
          {title}
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {truncatedDescription}
        </Typography>

        {/* Metadata */}
        <Box sx={{ mt: "auto" }}>
          {/* Variables Count */}
          {numberOfVariables && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {numberOfVariables.toLocaleString()} variables
              </Typography>
            </Box>
          )}

          {/* Publisher */}
          {publisher && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Published by {publisher}
              </Typography>
            </Box>
          )}

          {/* Data Catalog */}
          {dataCatalog && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Available in {dataCatalog}
              </Typography>
            </Box>
          )}

          {/* Chips for Countries and Study Design */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {countryCodes?.slice(0, 3).map((country) => (
              <Chip
                key={country}
                label={country}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.7rem", height: 20 }}
              />
            ))}
            {studyDesign?.slice(0, 2).map((design) => (
              <Chip
                key={design}
                label={design}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: "0.7rem", height: 20 }}
              />
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Wrap with Link if slug exists
  if (slug) {
    return (
      <Link href={`/studies/${slug}`} style={{ textDecoration: "none" }}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
