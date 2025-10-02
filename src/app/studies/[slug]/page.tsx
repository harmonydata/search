import { notFound } from "next/navigation";
import Script from "next/script";
import StudyDetail from "@/components/StudyDetail";
import { fetchAllStudiesWithUuids, fetchResultByUuid } from "@/services/api";
import {
  getCachedStudiesWithUuids,
  getCachedStudyBySlug,
} from "@/services/cachedData";
import { Metadata } from "next";

// This runs at build time for static export
export async function generateStaticParams() {
  try {
    console.log("Fetching studies for static generation...");

    // Try to use cached data first, fallback to API
    let studiesWithUuids;
    try {
      studiesWithUuids = getCachedStudiesWithUuids();
      console.log(`Using cached data: ${studiesWithUuids.length} studies`);
    } catch (error) {
      console.log("Cached data not available, falling back to API...");
      studiesWithUuids = await fetchAllStudiesWithUuids();
    }

    console.log(
      `Found ${studiesWithUuids.length} studies for static generation`
    );

    // Return ALL studies for static export (build-time compilation)
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
    // Try to use cached data first, fallback to API
    let fullStudyResult;
    try {
      fullStudyResult = getCachedStudyBySlug(slug);
    } catch (error) {
      fullStudyResult = await fetchResultByUuid(slug);
    }
    // Generate Open Graph and Twitter Card metadata
    const title =
      fullStudyResult.dataset_schema?.name ||
      fullStudyResult.extra_data?.name ||
      "Academic Study";
    const description =
      fullStudyResult.dataset_schema?.description ||
      fullStudyResult.extra_data?.description ||
      "Academic research study data";
    const image =
      (fullStudyResult.dataset_schema as any)?.image ||
      (fullStudyResult as any).image ||
      "/harmony.png";
    const url = `https://harmonydata.ac.uk/search/studies/${slug}`;

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
        // Use the same image reference to avoid duplication
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
  const gspStartTime = Date.now();
  const gspId = Math.random().toString(36).substring(7);

  console.log(
    `🚀 [${new Date().toISOString()}] [${gspId}] generateStaticProps started for slug: ${slug}`
  );

  try {
    // Try to use cached data first, fallback to API
    const fetchStartTime = Date.now();
    let fullStudyResult;
    try {
      console.log(
        `📡 [${new Date().toISOString()}] [${gspId}] Getting cached study data...`
      );
      fullStudyResult = getCachedStudyBySlug(slug);
      const fetchEndTime = Date.now();
      console.log(
        `✅ [${new Date().toISOString()}] [${gspId}] Cached study fetched in ${
          fetchEndTime - fetchStartTime
        }ms`
      );
    } catch (error) {
      console.log(
        `📡 [${new Date().toISOString()}] [${gspId}] Fetching study from API: ${slug}`
      );
      fullStudyResult = await fetchResultByUuid(slug);
      const fetchEndTime = Date.now();
      console.log(
        `✅ [${new Date().toISOString()}] [${gspId}] API study fetched in ${
          fetchEndTime - fetchStartTime
        }ms`
      );
    }

    console.log(
      `Found full study data for ${slug}:`,
      fullStudyResult.dataset_schema?.name
    );

    // Pass the raw SearchResult directly - StudyDetail will handle its own data fetching
    // Conditionally remove variables data to reduce static file size
    const hasVariables =
      (fullStudyResult.dataset_schema?.variableMeasured?.length || 0) > 0 ||
      (fullStudyResult.variables_which_matched?.length || 0) > 0;

    const strippedStudy = hasVariables
      ? {
          ...fullStudyResult,
          dataset_schema: {
            ...fullStudyResult.dataset_schema,
            variableMeasured: undefined, // Remove variables to reduce static file size
          },
          variables_which_matched: undefined,
        }
      : fullStudyResult; // Keep full data if no variables to strip

    const studyDataComplete = !hasVariables; // Complete if no variables were stripped

    const gspEndTime = Date.now();
    const totalGspTime = gspEndTime - gspStartTime;

    console.log(
      `✅ [${new Date().toISOString()}] [${gspId}] generateStaticProps completed successfully:`
    );
    console.log(`   📈 Total time: ${totalGspTime}ms`);
    console.log(
      `   📊 Study: ${slug} (${fullStudyResult.dataset_schema?.name})`
    );
    console.log(`   📦 Variables stripped: ${hasVariables ? "Yes" : "No"}`);
    console.log(`   🎯 Data complete: ${studyDataComplete ? "Yes" : "No"}`);

    // Prepare JSON-LD structured data (only include main study info, not child datasets)
    const structuredData = {
      "@context": "https://schema.org/",
      "@type": "Dataset",
      name: fullStudyResult.dataset_schema?.name,
      description: fullStudyResult.dataset_schema?.description,
      url: `https://harmonydata.ac.uk/search/studies/${slug}`,
      identifier: fullStudyResult.dataset_schema?.identifier,
      keywords: fullStudyResult.dataset_schema?.keywords,
      temporalCoverage: fullStudyResult.dataset_schema?.temporalCoverage,
      spatialCoverage: fullStudyResult.dataset_schema?.spatialCoverage,
      publisher: fullStudyResult.dataset_schema?.publisher,
      creator: fullStudyResult.dataset_schema?.creator,
      dateCreated: fullStudyResult.dataset_schema?.dateCreated,
      dateModified: fullStudyResult.dataset_schema?.dateModified,
      license: fullStudyResult.dataset_schema?.license,
      distribution: fullStudyResult.dataset_schema?.distribution,
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
        <StudyDetail
          study={strippedStudy}
          isDrawerView={false}
          studyDataComplete={studyDataComplete}
        />
      </>
    );
  } catch (error) {
    const errorEndTime = Date.now();
    const totalGspTime = errorEndTime - gspStartTime;
    console.error(
      `❌ [${new Date().toISOString()}] [${gspId}] Error in generateStaticProps after ${totalGspTime}ms:`,
      error
    );
    notFound();
  }
}
