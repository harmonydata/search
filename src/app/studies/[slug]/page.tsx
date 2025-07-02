import { Container, Box, Typography } from "@mui/material";
import StudyDetail from "@/components/StudyDetail";
import { transformSearchResultToStudyDetail } from "@/lib/utils/studyTransform";
import { notFound } from "next/navigation";
import StudyPageClient from "./StudyPageClient";

// Store all study data globally for static generation
let allStudyData: Map<string, any> | null = null;

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

    // Create a map of slug to study data
    allStudyData = new Map();

    // Store each study by its slug
    for (const study of studies) {
      if (study.extra_data?.slug) {
        allStudyData.set(study.extra_data.slug, study);
      }
    }

    const slugs = studies
      .map((study: any) => study.extra_data?.slug)
      .filter((slug: string) => Boolean(slug));

    console.log(`Generated ${slugs.length} study pages`);
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

    if (!allStudyData || !allStudyData.has(slug)) {
      throw new Error(`Study data not found for slug: ${slug}`);
    }

    const searchResult = allStudyData.get(slug);
    const study = transformSearchResultToStudyDetail(searchResult);

    return <StudyPageClient study={study} />;
  } catch (error) {
    console.error(`Failed to generate static page for study: ${slug}`, error);
    notFound();
  }
}
