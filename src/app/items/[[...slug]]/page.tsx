import { Suspense } from "react";
import ItemsPageClient from "./ItemsPageClient";
import {
  getCachedDatasetsWithUuids,
  getCachedStudiesWithUuids,
  getCachedChildDatasetsForStudy,
  getCachedDatasetBySlugOrUuid,
} from "@/services/cachedData";
import { fetchResultByUuid } from "@/services/api";
import { Metadata } from "next";

// Required for static export - pre-generate all item routes so GitHub Pages serves HTML files
export async function generateStaticParams() {
  try {
    const params: Array<{ slug: string[] }> = [];
    
    // Get all datasets and studies
    const datasetsWithUuids = getCachedDatasetsWithUuids();
    const studiesWithUuids = getCachedStudiesWithUuids();
    
    // Add all datasets by slug and UUID
    for (const dataset of datasetsWithUuids) {
      if (dataset.slug) {
        params.push({ slug: [dataset.slug] });
      }
      if (dataset.uuid) {
        params.push({ slug: [dataset.uuid] });
      }
    }
    
    // Add all child datasets from studies
    for (const study of studiesWithUuids) {
      try {
        const childDatasets = getCachedChildDatasetsForStudy(study.uuid);
        for (const childDataset of childDatasets) {
          if (childDataset.slug) {
            params.push({ slug: [childDataset.slug] });
          }
          if (childDataset.uuid) {
            params.push({ slug: [childDataset.uuid] });
          }
        }
      } catch (error) {
        // Skip if child datasets not available
        console.warn(`Failed to get child datasets for study ${study.uuid}:`, error);
      }
    }
    
    console.log(`📄 Generating ${params.length} item routes for static export`);
    return params;
  } catch (error) {
    console.error("Failed to generate static params for items:", error);
    // Return empty array as fallback
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const identifier = slug?.[0];

  if (!identifier) {
    return {
      title: "Dataset Not Found",
      description: "The requested dataset could not be found.",
    };
  }

  try {
    let fullDatasetResult;
    try {
      fullDatasetResult = getCachedDatasetBySlugOrUuid(identifier);
    } catch (error) {
      // Fallback to API if cached data not available
      try {
        fullDatasetResult = await fetchResultByUuid(identifier);
      } catch (apiError) {
        console.warn(`Failed to fetch dataset ${identifier}:`, apiError);
        return {
          title: "Dataset Not Found",
          description: "The requested dataset could not be found.",
        };
      }
    }

    const title =
      fullDatasetResult.dataset_schema?.name ||
      fullDatasetResult.extra_data?.name ||
      "Academic Dataset";
    const description =
      fullDatasetResult.dataset_schema?.description ||
      fullDatasetResult.extra_data?.description ||
      "Academic research dataset";
    const image =
      (fullDatasetResult.dataset_schema as any)?.image ||
      (fullDatasetResult as any).image ||
      "/harmony.png";
    const url = `https://harmonydata.ac.uk/search/items/${identifier}`;

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
    console.error(`Failed to generate metadata for dataset: ${identifier}`, error);
    return {
      title: "Dataset Not Found",
      description: "The requested dataset could not be found.",
    };
  }
}

export default async function ItemsPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const identifier = slug?.[0];

  if (!identifier) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Item Not Found</h1>
        <p>Please provide a valid item slug or UUID in the URL.</p>
      </div>
    );
  }

  // Try to find the dataset in cache at build time
  // If not found, try API during build time
  // This only runs during static generation, not at runtime
  let fullDatasetResult = null;
  try {
    // Try by slug/UUID first
    fullDatasetResult = getCachedDatasetBySlugOrUuid(identifier);
  } catch (error) {
    // If not in cache, try API during build time
    try {
      console.log(`Fetching dataset from API during build: ${identifier}`);
      fullDatasetResult = await fetchResultByUuid(identifier);
    } catch (apiError) {
      // If API fails during build, pass null - client will fetch at runtime
      console.log(
        `Dataset ${identifier} not found during build, will fetch client-side`
      );
      fullDatasetResult = null;
    }
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ItemsPageClient identifier={identifier} initialData={fullDatasetResult} />
    </Suspense>
  );
}
