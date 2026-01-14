"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import StudyDetail from "@/components/StudyDetail";
import { fetchResultByUuid, SearchResult } from "@/services/api";
import { CircularProgress, Box, Typography } from "@mui/material";

interface DatasetPageClientProps {
  slug: string;
  initialData: SearchResult | null;
}

export default function DatasetPageClient({
  slug,
  initialData,
}: DatasetPageClientProps) {
  const [datasetData, setDatasetData] = useState<SearchResult | null>(
    initialData
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we don't have initial data, fetch it client-side
    if (!initialData) {
      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);
          const result = await fetchResultByUuid(slug);
          setDatasetData(result);
        } catch (err) {
          console.error(`Failed to fetch dataset ${slug}:`, err);
          setError(
            err instanceof Error ? err.message : "Failed to load dataset"
          );
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [slug, initialData]);

  // Show loading state
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (error || !datasetData) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        gap={2}
      >
        <Typography variant="h5">Dataset Not Found</Typography>
        <Typography variant="body2" color="text.secondary">
          {error ||
            "The requested dataset could not be found. It may have been removed or the URL may be incorrect."}
        </Typography>
      </Box>
    );
  }

  // Prepare JSON-LD structured data - only include fields that exist
  const structuredData: Record<string, any> = {
    "@context": "https://schema.org/",
    "@type": "Dataset",
    name: datasetData.dataset_schema?.name,
    description: datasetData.dataset_schema?.description,
    url: `https://harmonydata.ac.uk/search/items/${slug}`,
  };

  // Add optional fields only if they exist
  if (datasetData.dataset_schema?.identifier) {
    structuredData.identifier = datasetData.dataset_schema.identifier;
  }
  if (datasetData.dataset_schema?.keywords) {
    structuredData.keywords = datasetData.dataset_schema.keywords;
  }
  if (datasetData.dataset_schema?.temporalCoverage) {
    structuredData.temporalCoverage = datasetData.dataset_schema.temporalCoverage;
  }
  if (datasetData.dataset_schema?.publisher) {
    structuredData.publisher = datasetData.dataset_schema.publisher;
  }
  if (datasetData.dataset_schema?.creator) {
    structuredData.creator = datasetData.dataset_schema.creator;
  }
  if (datasetData.dataset_schema?.license) {
    structuredData.license = datasetData.dataset_schema.license;
  }
  // Optional future fields
  if (datasetData.dataset_schema?.spatialCoverage) {
    structuredData.spatialCoverage = datasetData.dataset_schema.spatialCoverage;
  }
  if (datasetData.dataset_schema?.distribution) {
    structuredData.distribution = datasetData.dataset_schema.distribution;
  }
  if (datasetData.dataset_schema?.dateCreated) {
    structuredData.dateCreated = datasetData.dataset_schema.dateCreated;
  }
  if (datasetData.dataset_schema?.dateModified) {
    structuredData.dateModified = datasetData.dataset_schema.dateModified;
  }

  return (
    <>
      <Script
        strategy="beforeInteractive"
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <StudyDetail study={datasetData} />
    </>
  );
}
