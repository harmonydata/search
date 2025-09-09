import { Container, Box, Typography } from "@mui/material";
import DatasetDetail from "@/components/DatasetDetail";
import { transformSearchResultToDatasetDetail } from "@/lib/utils/datasetTransform";
import { notFound } from "next/navigation";
import DatasetPageClient from "./DatasetPageClient";
import { fetchAllStudiesWithUuids, fetchResultByUuid } from "@/services/api";
import { Metadata } from "next";

// This runs at build time for static export
export async function generateStaticParams() {
  try {
    console.log(
      "Fetching studies to find their child datasets for static generation..."
    );

    // Get all studies first
    const studiesWithUuids = await fetchAllStudiesWithUuids();
    console.log(`Found ${studiesWithUuids.length} studies`);

    // Collect all child dataset UUIDs from studies
    const childDatasetUuids = new Set<string>();

    for (const study of studiesWithUuids) {
      try {
        // Fetch the full study data to get child datasets
        const studyData = await fetchResultByUuid(study.uuid);
        if (studyData.child_datasets) {
          for (const childDataset of studyData.child_datasets) {
            if (childDataset.extra_data?.uuid) {
              childDatasetUuids.add(childDataset.extra_data.uuid);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch study ${study.uuid}:`, error);
      }
    }

    console.log(
      `Found ${childDatasetUuids.size} child datasets for static generation`
    );

    // Return the params for each child dataset UUID
    return Array.from(childDatasetUuids).map((uuid) => ({ slug: uuid }));
  } catch (error) {
    console.error("Failed to generate static params:", error);
    return [];
  }
}

// Helper function to check if a string is a UUID or hash-based ID
function isUUID(str: string): boolean {
  // Check for proper UUID format with dashes
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    return true;
  }

  // Check for hash-based ID format (32 hex characters)
  const hashRegex = /^[0-9a-f]{32}$/i;
  return hashRegex.test(str);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Always try direct lookup - the API should handle both UUIDs and slugs
    const fullDatasetResult = await fetchResultByUuid(slug);

    const dataset = transformSearchResultToDatasetDetail(fullDatasetResult);

    // Generate Open Graph and Twitter Card metadata
    const title = dataset.title || "Academic Dataset";
    const description = dataset.description || "Academic research dataset";
    const image = dataset.image || "/harmony.png";
    const url = `https://discoverynext.vercel.app/items/${slug}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: "Academic Resource Discovery",
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        locale: "en_US",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    };
  } catch (error) {
    console.error(`Failed to generate metadata for dataset: ${slug}`, error);
    return {
      title: "Dataset Not Found",
      description: "The requested dataset could not be found.",
    };
  }
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    console.log(`Generating page for dataset: ${slug}`);

    // Always try direct lookup - the API should handle both UUIDs and slugs
    console.log(`Fetching dataset by lookup: ${slug}`);
    const fullDatasetResult = await fetchResultByUuid(slug);

    console.log(
      `Found full dataset data for ${slug}:`,
      fullDatasetResult.dataset_schema?.name
    );

    const dataset = transformSearchResultToDatasetDetail(fullDatasetResult);

    // Prepare JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org/",
      ...fullDatasetResult.dataset_schema,
      url: `https://discoverynext.vercel.app/items/${slug}`,
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <DatasetPageClient dataset={dataset} />
      </>
    );
  } catch (error) {
    console.error(`Failed to generate page for dataset: ${slug}`, error);
    notFound();
  }
}
