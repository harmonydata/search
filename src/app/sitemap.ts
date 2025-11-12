import { MetadataRoute } from "next";
import {
  getCachedStudiesWithUuids,
  getCachedDatasetsWithUuids,
} from "@/services/cachedData";

// Required for static export
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://harmonydata.ac.uk/search";

  // Main navigation pages
  const mainPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/studies`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/saves`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/items`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ];

  try {
    // Get all studies and datasets for the sitemap
    const studiesWithUuids = getCachedStudiesWithUuids();
    const datasetsWithUuids = getCachedDatasetsWithUuids();

    // Generate study pages
    const studyPages = studiesWithUuids.map((study) => ({
      url: `${baseUrl}/studies/${study.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

    // Generate dataset pages (use UUID if slug too long, matches static generation)
    const datasetPages = datasetsWithUuids.map((dataset) => {
      const identifier =
        dataset.slug && dataset.slug.length > 220 ? dataset.uuid : dataset.slug;

      return {
        url: `${baseUrl}/items/${identifier}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      };
    });

    return [...mainPages, ...studyPages, ...datasetPages];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    // Return at least the main pages even if cached data fails
    return mainPages;
  }
}
