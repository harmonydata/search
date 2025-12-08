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
import ChildDatasetsDataGrid from "@/components/ChildDatasetsDataGrid";

interface DatasetDetailProps {
  dataset: {
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
    matchedVariables?: any[];
    allVariables?: any[];
    additionalLinks?: string[];
    child_datasets?: any[];
  };
}

const DatasetDetail = memo(function DatasetDetail({
  dataset,
}: DatasetDetailProps) {
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    description: true,
    metadata: false,
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

  const metadataItems = useMemo(() => {
    const items = [];

    if (dataset.resourceType) {
      items.push({ label: "Resource Type", value: dataset.resourceType });
    }

    if (dataset.geographicCoverage) {
      items.push({
        label: "Geographic Coverage",
        value: dataset.geographicCoverage,
      });
    }

    if (dataset.temporalCoverage) {
      items.push({
        label: "Temporal Coverage",
        value: dataset.temporalCoverage,
      });
    }

    if (dataset.ageCoverage) {
      items.push({ label: "Age Coverage", value: dataset.ageCoverage });
    }

    if (dataset.studyDesign && dataset.studyDesign.length > 0) {
      items.push({
        label: "Study Design",
        value: dataset.studyDesign.join(", "),
      });
    }

    if (dataset.instruments && dataset.instruments.length > 0) {
      items.push({
        label: "Instruments",
        value: dataset.instruments.join(", "),
      });
    }

    return items;
  }, [dataset]);

  return (
    <Box>
      {/* Header with image and title */}
      <Box sx={{ display: "flex", gap: 3, mb: 4 }}>
        {dataset.image && (
          <Box sx={{ flexShrink: 0 }}>
            <Image
              src={dataset.image}
              alt={dataset.title}
              width={200}
              height={150}
              style={{
                objectFit: "cover",
                borderRadius: "8px",
              }}
            />
          </Box>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            {dataset.title}
          </Typography>
          {dataset.publisher && (
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Published by {dataset.publisher.name}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Description Section */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 2,
            cursor: "pointer",
          }}
          onClick={() => toggleSection("description")}
        >
          <Typography variant="h5" component="h2">
            Description
          </Typography>
          <IconButton size="small" sx={{ ml: 1 }}>
            {expandedSections.description ? <ChevronUp /> : <ChevronDown />}
          </IconButton>
        </Box>
        <Collapse in={expandedSections.description}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <TextWithLinkPreviews text={dataset.description} />
          </Typography>
        </Collapse>
      </Box>

      {/* Topics Section */}
      {dataset.topics && dataset.topics.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Topics
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {dataset.topics.map((topic, index) => (
              <SquareChip key={index}>{topic}</SquareChip>
            ))}
          </Box>
        </Box>
      )}

      {/* Metadata Section */}
      {metadataItems.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 2,
              cursor: "pointer",
            }}
            onClick={() => toggleSection("metadata")}
          >
            <Typography variant="h5" component="h2">
              Dataset Information
            </Typography>
            <IconButton size="small" sx={{ ml: 1 }}>
              {expandedSections.metadata ? <ChevronUp /> : <ChevronDown />}
            </IconButton>
          </Box>
          <Collapse in={expandedSections.metadata}>
            <Box sx={{ display: "grid", gap: 2 }}>
              {metadataItems.map((item, index) => (
                <Box key={index}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {item.label}:
                  </Typography>
                  <Typography variant="body1">{item.value}</Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Publisher Section */}
      {dataset.publisher && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Publisher
          </Typography>
          <OrganizationCard
            name={dataset.publisher.name}
            url={dataset.publisher.url}
            logo={dataset.publisher.logo}
          />
        </Box>
      )}

      {/* Funders Section */}
      {dataset.funders && dataset.funders.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Funders
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {dataset.funders.map((funder, index) => (
              <OrganizationCard
                key={index}
                name={funder.name}
                url={funder.url}
                logo={funder.logo}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Data Catalogs Section */}
      {dataset.dataCatalogs && dataset.dataCatalogs.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Data Catalogs
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {dataset.dataCatalogs.map((catalog, index) => (
              <DataCatalogCard
                key={index}
                name={catalog.name}
                url={catalog.url}
                logo={catalog.logo}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Variables Section */}
      {dataset.matchedVariables && dataset.matchedVariables.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 2,
              cursor: "pointer",
            }}
            onClick={() => toggleSection("variables")}
          >
            <Typography variant="h5" component="h2">
              Matched Variables ({dataset.matchedVariables.length})
            </Typography>
            <IconButton size="small" sx={{ ml: 1 }}>
              {expandedSections.variables ? <ChevronUp /> : <ChevronDown />}
            </IconButton>
          </Box>
          <Collapse in={expandedSections.variables}>
            <MatchedVariablesDataGrid variables={dataset.matchedVariables} />
          </Collapse>
        </Box>
      )}

      {/* Additional Links Section */}
      {dataset.additionalLinks && dataset.additionalLinks.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 2,
              cursor: "pointer",
            }}
            onClick={() => toggleSection("links")}
          >
            <Typography variant="h5" component="h2">
              Additional Links ({dataset.additionalLinks.length})
            </Typography>
            <IconButton size="small" sx={{ ml: 1 }}>
              {expandedSections.links ? <ChevronUp /> : <ChevronDown />}
            </IconButton>
          </Box>
          <Collapse in={expandedSections.links}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 2,
                "@media (max-width: 800px)": {
                  gridTemplateColumns: "1fr",
                },
              }}
            >
              {dataset.additionalLinks.map((link, index) => {
                const linksLength = dataset.additionalLinks?.length ?? 0;
                const isLast = index === linksLength - 1;
                const isOdd = linksLength % 2 !== 0;
                const shouldSpanFull = isLast && isOdd;

                return (
                  <Box
                    key={index}
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
          </Collapse>
        </Box>
      )}

      {/* Child Datasets Section */}
      {dataset.child_datasets && dataset.child_datasets.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 2,
              cursor: "pointer",
            }}
            onClick={() => toggleSection("childDatasets")}
          >
            <Typography variant="h5" component="h2">
              Related Datasets ({dataset.child_datasets.length})
            </Typography>
            <IconButton size="small" sx={{ ml: 1 }}>
              {expandedSections.childDatasets ? <ChevronUp /> : <ChevronDown />}
            </IconButton>
          </Box>
          <Collapse in={expandedSections.childDatasets}>
            <ChildDatasetsDataGrid datasets={dataset.child_datasets} />
          </Collapse>
        </Box>
      )}

      {/* Debug Section */}
      <Box sx={{ mt: 4, pt: 4, borderTop: 1, borderColor: "divider" }}>
        <StudyDetailDebugDialog
          open={false}
          onClose={() => {}}
          title={dataset.title}
          finalProcessedData={dataset}
        />
      </Box>
    </Box>
  );
});

export default DatasetDetail;
