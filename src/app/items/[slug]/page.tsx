import { Container, Box, Typography } from "@mui/material";
import DatasetDetail from "@/components/DatasetDetail";
import { transformSearchResultToDatasetDetail } from "@/lib/utils/datasetTransform";
import { notFound } from "next/navigation";
import DatasetPageClient from "./DatasetPageClient";
import { fetchAllDatasetsWithUuids, fetchResultByUuid } from "@/services/api";
import { Metadata } from "next";

// This runs at build time for static export
export async function generateStaticParams() {
  try {
    console.log("Fetching all datasets for static generation...");

    // Use the API service to get all datasets with UUIDs
    const datasetsWithUuids = await fetchAllDatasetsWithUuids();

    console.log(
      `Found ${datasetsWithUuids.length} datasets for static generation`
    );

    // Return the params for each dataset - both slug and UUID versions
    const params = [];
    for (const dataset of datasetsWithUuids) {
      // Add slug version if available
      if (dataset.slug) {
        params.push({ slug: dataset.slug });
      }
      // Add UUID version
      if (dataset.uuid) {
        params.push({ slug: dataset.uuid });
      }
    }
    return params;
  } catch (error) {
    console.error("Failed to generate static params:", error);
    return [];
  }
}

// Helper function to check if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    let fullDatasetResult;

    if (isUUID(slug)) {
      // If it's a UUID, fetch directly
      fullDatasetResult = await fetchResultByUuid(slug);
    } else {
      // If it's a slug, find the dataset and fetch by UUID
      const datasetsWithUuids = await fetchAllDatasetsWithUuids();
      const datasetWithUuid = datasetsWithUuids.find(
        (dataset) => dataset.slug === slug
      );

      if (!datasetWithUuid) {
        return {
          title: "Dataset Not Found",
          description: "The requested dataset could not be found.",
        };
      }

      fullDatasetResult = await fetchResultByUuid(datasetWithUuid.uuid);
    }

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

    let fullDatasetResult;

    if (isUUID(slug)) {
      // If it's a UUID, fetch directly
      console.log(`Fetching dataset by UUID: ${slug}`);
      fullDatasetResult = await fetchResultByUuid(slug);
    } else {
      // If it's a slug, find the dataset and fetch by UUID
      console.log(`Looking up dataset by slug: ${slug}`);
      const datasetsWithUuids = await fetchAllDatasetsWithUuids();
      const datasetWithUuid = datasetsWithUuids.find(
        (dataset) => dataset.slug === slug
      );

      if (!datasetWithUuid) {
        throw new Error(`Dataset with slug "${slug}" not found`);
      }

      const uuid = datasetWithUuid.uuid;
      console.log(`Found dataset UUID for ${slug}: ${uuid}`);

      // Use the API service to fetch the full dataset data using the UUID
      fullDatasetResult = await fetchResultByUuid(uuid);
    }

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
