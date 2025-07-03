import { Container, Box, Typography } from "@mui/material";
import StudyDetail from "@/components/StudyDetail";
import { transformSearchResultToStudyDetail } from "@/lib/utils/studyTransform";
import { notFound } from "next/navigation";
import StudyPageClient from "./StudyPageClient";
import { fetchAllStudiesWithUuids, fetchResultByUuid } from "@/services/api";

// This runs at build time for static export
export async function generateStaticParams() {
  try {
    console.log("Fetching all studies for static generation...");

    // Use the API service to get all studies with UUIDs
    const studiesWithUuids = await fetchAllStudiesWithUuids();

    console.log(
      `Found ${studiesWithUuids.length} studies for static generation`
    );

    // Return the params for each study
    return studiesWithUuids.map((study) => ({
      slug: study.slug,
    }));
  } catch (error) {
    console.error("Failed to generate static params:", error);
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

    // Use the API service to get all studies and find the matching one
    const studiesWithUuids = await fetchAllStudiesWithUuids();

    // Find the study with the matching slug
    const studyWithUuid = studiesWithUuids.find((study) => study.slug === slug);

    if (!studyWithUuid) {
      throw new Error(`Study with slug "${slug}" not found`);
    }

    const uuid = studyWithUuid.uuid;
    console.log(`Found study UUID for ${slug}: ${uuid}`);

    // Use the API service to fetch the full study data using the UUID
    const fullStudyResult = await fetchResultByUuid(uuid);

    console.log(
      `Found full study data for ${slug}:`,
      fullStudyResult.dataset_schema?.name
    );

    const study = transformSearchResultToStudyDetail(fullStudyResult);

    return <StudyPageClient study={study} />;
  } catch (error) {
    console.error(`Failed to generate static page for study: ${slug}`, error);
    notFound();
  }
}
