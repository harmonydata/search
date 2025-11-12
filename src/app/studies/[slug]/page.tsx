import { notFound } from "next/navigation";
import Script from "next/script";
import { Suspense } from "react";
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
    // Try to use cached data first, fallback to API
    let studiesWithUuids;
    try {
      studiesWithUuids = getCachedStudiesWithUuids();
      console.log(
        `\n🏗️  Building static study pages: ${studiesWithUuids.length} studies`
      );
    } catch (error) {
      console.log("⚠️  Cached data not available, falling back to API...");
      studiesWithUuids = await fetchAllStudiesWithUuids();
      console.log(
        `\n🏗️  Building static study pages: ${studiesWithUuids.length} studies`
      );
    }

    // Return ALL studies for static export (build-time compilation)
    const params = studiesWithUuids.map((study) => ({
      slug: study.slug,
    }));

    console.log(`📄 Study slugs to be built: ${params.length}`);
    return params;
  } catch (error) {
    console.error("❌ Failed to generate static params:", error);
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

  try {
    // Try to use cached data first, fallback to API
    let fullStudyResult;
    try {
      fullStudyResult = getCachedStudyBySlug(slug);
    } catch (error) {
      fullStudyResult = await fetchResultByUuid(slug);
    }

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
        <Suspense fallback={<div>Loading...</div>}>
          <StudyDetail
            study={strippedStudy}
            isDrawerView={false}
            studyDataComplete={studyDataComplete}
          />
        </Suspense>
      </>
    );
  } catch (error) {
    console.error(`❌ Error generating study page for ${slug}:`, error);
    notFound();
  }
}
