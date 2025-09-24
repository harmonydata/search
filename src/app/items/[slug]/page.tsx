import { Container, Box, Typography } from "@mui/material";
import DatasetDetail from "@/components/DatasetDetail";
import { transformSearchResultToDatasetDetail } from "@/lib/utils/datasetTransform";
import { notFound } from "next/navigation";
import DatasetPageClient from "./DatasetPageClient";
import {
  fetchAllStudiesWithUuids,
  fetchAllDatasetsWithUuids,
  fetchResultByUuid,
} from "@/services/api";
import { Metadata } from "next";

// This runs at build time for static export
export async function generateStaticParams() {
  try {
    console.log("Fetching studies and datasets for static generation...");

    // Get all studies and datasets
    const [studiesWithUuids, datasetsWithUuids] = await Promise.all([
      fetchAllStudiesWithUuids(),
      fetchAllDatasetsWithUuids(),
    ]);

    console.log(`Found ${studiesWithUuids.length} studies`);
    console.log(`Found ${datasetsWithUuids.length} standalone datasets`);

    const params = [];

    // Process studies and their child datasets
    for (const study of studiesWithUuids) {
      try {
        // Fetch the full study data to get child datasets
        const studyData = await fetchResultByUuid(
          study.uuid,
          undefined,
          undefined,
          0.4
        );

        // Add study by slug
        if (study.slug) {
          params.push({ slug: study.slug });
        }

        // Add study by UUID (will redirect to slug)
        if (study.uuid) {
          params.push({ slug: study.uuid });
        }

        // Add child datasets by slug only
        if (studyData.child_datasets) {
          for (const childDataset of studyData.child_datasets) {
            if (childDataset.extra_data?.slug) {
              params.push({ slug: childDataset.extra_data.slug });
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch study ${study.uuid}:`, error);
      }
    }

    // Process all standalone datasets
    for (const dataset of datasetsWithUuids) {
      try {
        // Add dataset by slug
        if (dataset.slug) {
          params.push({ slug: dataset.slug });
        }

        // Add dataset by UUID (will redirect to slug)
        if (dataset.uuid) {
          params.push({ slug: dataset.uuid });
        }
      } catch (error) {
        console.warn(`Failed to process dataset ${dataset.uuid}:`, error);
      }
    }

    console.log(`Generated ${params.length} static pages`);

    return params;
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
    const fullDatasetResult = await fetchResultByUuid(
      slug,
      undefined,
      undefined,
      0.4
    );

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

    // Fetch the data
    const fullDatasetResult = await fetchResultByUuid(
      slug,
      undefined,
      undefined,
      0.4
    );

    // Check if this is a study UUID that should redirect to slug
    if (isUUID(slug) && fullDatasetResult.extra_data?.slug) {
      // This is a study UUID, redirect to the slug version
      return (
        <div>
          <script
            dangerouslySetInnerHTML={{
              __html: `window.location.replace('/items/${fullDatasetResult.extra_data.slug}');`,
            }}
          />
          <p>
            Redirecting to{" "}
            <a href={`/items/${fullDatasetResult.extra_data.slug}`}>
              /items/{fullDatasetResult.extra_data.slug}
            </a>
            ...
          </p>
        </div>
      );
    }

    console.log(
      `Found full dataset data for ${slug}:`,
      fullDatasetResult.dataset_schema?.name
    );

    // Transform the data for StudyDetail component
    const studyData = transformSearchResultToDatasetDetail(fullDatasetResult);

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
        <DatasetPageClient dataset={studyData} />
      </>
    );
  } catch (error) {
    console.error(`Failed to generate page for dataset: ${slug}`, error);
    notFound();
  }
}
