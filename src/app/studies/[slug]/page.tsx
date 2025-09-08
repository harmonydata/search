import { Container, Box, Typography } from "@mui/material";
import StudyDetail from "@/components/StudyDetail";
import { transformSearchResultToStudyDetail } from "@/lib/utils/studyTransform";
import { notFound } from "next/navigation";
import StudyPageClient from "./StudyPageClient";
import { fetchAllStudiesWithUuids, fetchResultByUuid } from "@/services/api";
import { Metadata } from "next";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Get the study data (same logic as the page component)
    const studiesWithUuids = await fetchAllStudiesWithUuids();
    const studyWithUuid = studiesWithUuids.find((study) => study.slug === slug);

    if (!studyWithUuid) {
      return {
        title: "Study Not Found",
        description: "The requested study could not be found.",
      };
    }

    const fullStudyResult = await fetchResultByUuid(studyWithUuid.uuid);
    const study = transformSearchResultToStudyDetail(fullStudyResult);

    // Generate Open Graph and Twitter Card metadata
    const title = study.title || "Academic Study";
    const description = study.description || "Academic research study data";
    const image = study.image || "/harmony.png";
    const url = `https://discoverynext.vercel.app/studies/${slug}`;

    // Generate structured data (JSON-LD) using the full dataset schema
    const structuredData = {
      "@context": "https://schema.org",
      ...fullStudyResult.dataset_schema,
      url: url,
    };

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
    console.error(`Failed to generate metadata for study: ${slug}`, error);
    return {
      title: "Study Not Found",
      description: "The requested study could not be found.",
    };
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

    // Prepare JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org/",
      ...fullStudyResult.dataset_schema,
      url: `https://discoverynext.vercel.app/studies/${slug}`,
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <StudyPageClient study={study} />
      </>
    );
  } catch (error) {
    console.error(`Failed to generate static page for study: ${slug}`, error);
    notFound();
  }
}
