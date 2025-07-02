import { Container, Box, Typography } from "@mui/material";
import StudyDetail from "@/components/StudyDetail";
import { transformSearchResultToStudyDetail } from "@/lib/utils/studyTransform";
import { notFound } from "next/navigation";
import StudyPageClient from "./StudyPageClient";

// This runs at build time for static export
export async function generateStaticParams() {
  try {
    console.log("Fetching all studies for static generation...");

    // Fetch all studies in one request - this already has all the data we need!
    const response = await fetch(
      "https://harmonydataweaviate.azureedge.net/discover/search?query=*&num_results=1000&offset=0&resource_type=study"
    );

    if (!response.ok) {
      throw new Error("Failed to fetch studies for static generation");
    }

    const data = await response.json();
    const studies = data.results || [];

    console.log(`Found ${studies.length} studies with full data`);

    const slugs = studies
      .map((study: any) => study.extra_data?.slug)
      .filter((slug: string) => Boolean(slug));

    console.log(`Generated ${slugs.length} study pages`);
    console.log(`Available slugs:`, slugs.slice(0, 5)); // Log first 5 slugs
    return slugs.map((slug: string) => ({
      slug: slug,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export default async function StudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    console.log(`Generating static page for study: ${slug}`);

    // Fetch the specific study data for this slug
    const response = await fetch(
      `https://harmonydataweaviate.azureedge.net/discover/search?query=*&num_results=1&offset=0&resource_type=study&slug=${encodeURIComponent(
        slug
      )}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch study by slug: ${response.statusText}`);
    }

    const data = await response.json();
    const studyResult = data.results?.[0];

    if (!studyResult) {
      throw new Error(`Study with slug "${slug}" not found`);
    }

    console.log(`Found study data for ${slug}:`, studyResult.extra_data?.name);

    const study = transformSearchResultToStudyDetail(studyResult);

    return <StudyPageClient study={study} />;
  } catch (error) {
    console.error(`Failed to generate static page for study: ${slug}`, error);
    notFound();
  }
}
