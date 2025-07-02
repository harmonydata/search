import { Container, Box, Typography } from "@mui/material";
import { fetchStudyBySlug } from "@/services/api";
import StudyDetail from "@/components/StudyDetail";
import { transformSearchResultToStudyDetail } from "@/lib/utils/studyTransform";
import { notFound } from "next/navigation";
import StudyPageClient from "./StudyPageClient";

// This runs at build time for static export
export async function generateStaticParams() {
  try {
    console.log("Fetching all study slugs for static generation...");
    const response = await fetch(
      "https://harmonydataweaviate.azureedge.net/discover/search?query=*&num_results=1000&offset=0&resource_type=study"
    );

    if (!response.ok) {
      throw new Error("Failed to fetch studies for static generation");
    }

    const data = await response.json();
    const slugs =
      data.results
        ?.map((study: any) => study.extra_data?.slug)
        .filter((slug: string) => Boolean(slug)) || [];

    console.log(`Found ${slugs.length} studies to generate`);
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
    // Pre-fetch the study data at build time
    const searchResult = await fetchStudyBySlug(slug);
    const study = transformSearchResultToStudyDetail(searchResult);

    return <StudyPageClient study={study} />;
  } catch (error) {
    console.error(`Failed to fetch study: ${slug}`, error);
    notFound();
  }
}
