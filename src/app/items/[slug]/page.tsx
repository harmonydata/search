import { transformSearchResultToDatasetDetail } from "@/lib/utils/datasetTransform";
import { notFound } from "next/navigation";
import Script from "next/script";
import DatasetPageClient from "./DatasetPageClient";
import {
  fetchAllStudiesWithUuids,
  fetchAllDatasetsWithUuids,
  fetchResultByUuid,
} from "@/services/api";
import {
  getCachedDatasetsWithUuids,
  getCachedChildDatasetsForStudy,
  getCachedDatasetBySlugOrUuid,
} from "@/services/cachedData";
import { Metadata } from "next";

// This runs at build time for static export
export async function generateStaticParams() {
  try {
    // Try to use cached data first, fallback to API
    let studiesWithUuids,
      datasetsWithUuids,
      usingCachedData = false;
    try {
      datasetsWithUuids = getCachedDatasetsWithUuids();
      usingCachedData = true;
    } catch (error) {
      console.error("Cached data not available, falling back to API:", error);
      [studiesWithUuids, datasetsWithUuids] = await Promise.all([
        fetchAllStudiesWithUuids(),
        fetchAllDatasetsWithUuids(),
      ]);
    }

    const params = [];

    if (!usingCachedData && studiesWithUuids) {
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
          try {
            const childDatasets = getCachedChildDatasetsForStudy(study.uuid);
            for (const childDataset of childDatasets) {
              params.push({ slug: childDataset.slug });
            }
          } catch (error) {
            // Fallback to API if cached data not available
            if (studyData.child_datasets) {
              for (const childDataset of studyData.child_datasets) {
                if (childDataset.extra_data?.slug) {
                  params.push({ slug: childDataset.extra_data.slug });
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch study ${study.uuid}:`, error);
        }
      }
    }

    // Process all standalone datasets
    for (const dataset of datasetsWithUuids) {
      try {
        // Add dataset by slug (use UUID if slug too long)
        if (dataset.slug) {
          if (dataset.slug.length > 220) {
            // Use UUID instead of slug if too long
            params.push({ slug: dataset.uuid });
          } else {
            params.push({ slug: dataset.slug });
          }
        }
      } catch (error) {
        console.warn(`Failed to process dataset ${dataset.uuid}:`, error);
      }
    }

    return params;
  } catch (error) {
    console.error("Failed to generate static params:", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Find the dataset by slug (could be from studies or standalone datasets)
    // Try to find the dataset directly using getCachedDatasetByUuid (works for both slugs and UUIDs)
    let fullDatasetResult;
    try {
      fullDatasetResult = getCachedDatasetBySlugOrUuid(slug);

      if (!fullDatasetResult) {
        // Fallback to API if cached data not available
        try {
          console.log(`Fetching dataset from API ${slug}`);
          fullDatasetResult = await fetchResultByUuid(slug);
        } catch (apiError) {
          console.warn(`Failed to fetch dataset ${slug}:`, apiError);
        }
      }
    } catch (error) {
      // Dataset not found in cache, will fall back to API later
      fullDatasetResult = null;
    }

    if (!fullDatasetResult) {
      return {
        title: "Dataset Not Found",
        description: "The requested dataset could not be found.",
      };
    }

    const dataset = transformSearchResultToDatasetDetail(fullDatasetResult);

    // Generate Open Graph and Twitter Card metadata
    const title = dataset.title || "Academic Dataset";
    const description = dataset.description || "Academic research dataset";
    const image = dataset.image || "/harmony.png";
    const url = `https://harmonydata.ac.uk/search/items/${slug}`;

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
    // Find the dataset by slug (could be from studies or standalone datasets)
    let fullDatasetResult;
    try {
      // Try by slug first
      fullDatasetResult = getCachedDatasetBySlugOrUuid(slug);
    } catch (error) {
      // Fallback to API if not found in cache
      console.log(`Fetching dataset from API ${slug}`);
      fullDatasetResult = await fetchResultByUuid(slug);
    }

    // Dataset data found successfully

    // Transform the data for StudyDetail component
    const datasetData = transformSearchResultToDatasetDetail(fullDatasetResult);

    // Prepare JSON-LD structured data (only include main dataset info)
    const structuredData = {
      "@context": "https://schema.org/",
      "@type": "Dataset",
      name: fullDatasetResult.dataset_schema?.name,
      description: fullDatasetResult.dataset_schema?.description,
      url: `https://harmonydata.ac.uk/search/items/${slug}`,
      identifier: fullDatasetResult.dataset_schema?.identifier,
      keywords: fullDatasetResult.dataset_schema?.keywords,
      temporalCoverage: fullDatasetResult.dataset_schema?.temporalCoverage,
      spatialCoverage: fullDatasetResult.dataset_schema?.spatialCoverage,
      publisher: fullDatasetResult.dataset_schema?.publisher,
      creator: fullDatasetResult.dataset_schema?.creator,
      dateCreated: fullDatasetResult.dataset_schema?.dateCreated,
      dateModified: fullDatasetResult.dataset_schema?.dateModified,
      license: fullDatasetResult.dataset_schema?.license,
      distribution: fullDatasetResult.dataset_schema?.distribution,
    };

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
        <DatasetPageClient dataset={datasetData} />
      </>
    );
  } catch (error) {
    console.error(`Failed to generate page for dataset: ${slug}`, error);
    notFound();
  }
}
