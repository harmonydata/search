import { fetchAllStudiesWithUuids } from "@/services/api";

// Required for static export
export const dynamic = "force-static";

export default async function sitemap() {
  const baseUrl = "https://harmonydata.ac.uk/search";

  // Get all studies for the sitemap
  const studiesWithUuids = await fetchAllStudiesWithUuids();

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
  ];

  // Generate study pages
  const studyPages = studiesWithUuids.map((study) => ({
    url: `${baseUrl}/studies/${study.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...mainPages, ...studyPages];
}
