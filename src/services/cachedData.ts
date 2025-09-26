import fs from "fs";
import path from "path";

const TMP_DIR = path.join(process.cwd(), "tmp");

interface CachedStudy {
  uuid: string;
  slug: string;
  data: any;
}

interface CachedDataset {
  uuid: string;
  slug: string;
  data: any;
}

interface CachedChildDataset {
  uuid: string;
  slug: string;
  parentStudyUuid: string;
  data: any;
}

let cachedStudies: CachedStudy[] | null = null;
let cachedDatasets: CachedDataset[] | null = null;
let cachedChildDatasets: CachedChildDataset[] | null = null;

function loadCachedData() {
  if (cachedStudies && cachedDatasets && cachedChildDatasets) {
    return { cachedStudies, cachedDatasets, cachedChildDatasets };
  }

  try {
    const studiesFile = path.join(TMP_DIR, "studies.json");
    const datasetsFile = path.join(TMP_DIR, "datasets.json");
    const childDatasetsFile = path.join(TMP_DIR, "child-datasets.json");

    if (
      !fs.existsSync(studiesFile) ||
      !fs.existsSync(datasetsFile) ||
      !fs.existsSync(childDatasetsFile)
    ) {
      throw new Error(
        "Cached data files not found. Run the pre-build script first."
      );
    }

    cachedStudies = JSON.parse(fs.readFileSync(studiesFile, "utf8"));
    cachedDatasets = JSON.parse(fs.readFileSync(datasetsFile, "utf8"));
    cachedChildDatasets = JSON.parse(
      fs.readFileSync(childDatasetsFile, "utf8")
    );

    // Cached data loaded successfully

    return { cachedStudies, cachedDatasets, cachedChildDatasets };
  } catch (error) {
    console.error("Failed to load cached data:", error);
    throw error;
  }
}

export function getCachedStudiesWithUuids(): Array<{
  slug: string;
  uuid: string;
}> {
  const { cachedStudies } = loadCachedData();
  return (cachedStudies || []).map((study) => ({
    slug: study.slug,
    uuid: study.uuid,
  }));
}

export function getCachedDatasetsWithUuids(): Array<{
  slug: string;
  uuid: string;
}> {
  const { cachedDatasets } = loadCachedData();
  return (cachedDatasets || []).map((dataset) => ({
    slug: dataset.slug,
    uuid: dataset.uuid,
  }));
}

export function getCachedChildDatasetsForStudy(
  studyUuid: string
): Array<{ slug: string; uuid: string }> {
  const { cachedChildDatasets } = loadCachedData();
  return (cachedChildDatasets || [])
    .filter((child) => child.parentStudyUuid === studyUuid)
    .map((child) => ({
      slug: child.slug,
      uuid: child.uuid,
    }));
}

export function getCachedStudyByUuid(uuid: string): any {
  try {
    const { cachedStudies } = loadCachedData();
    const study = (cachedStudies || []).find((s) => s.uuid === uuid);
    if (!study) {
      console.error(`Study with UUID "${uuid}" not found in cached data`);
      throw new Error(`Study with UUID "${uuid}" not found in cached data`);
    }
    return study.data;
  } catch (error) {
    console.error(`Error in getCachedStudyByUuid(${uuid}):`, error);
    throw error;
  }
}

export function getCachedDatasetByUuid(uuid: string): any {
  const { cachedDatasets, cachedChildDatasets } = loadCachedData();

  // Check standalone datasets first
  let dataset = (cachedDatasets || []).find((d) => d.uuid === uuid);
  if (dataset) {
    return dataset.data;
  }

  // Check child datasets
  dataset = (cachedChildDatasets || []).find((d) => d.uuid === uuid);
  if (dataset) {
    return dataset.data;
  }

  throw new Error(`Dataset with UUID "${uuid}" not found in cached data`);
}

export function getCachedStudyBySlug(slug: string): any {
  const { cachedStudies } = loadCachedData();
  const study = (cachedStudies || []).find((s) => s.slug === slug);
  if (!study) {
    throw new Error(`Study with slug "${slug}" not found in cached data`);
  }
  console.log(`Found study with slug "${slug}" in cached data`);
  return study.data;
}

export function getCachedDatasetBySlug(slug: string): any {
  const { cachedDatasets, cachedChildDatasets } = loadCachedData();

  // Check standalone datasets first
  let dataset = (cachedDatasets || []).find((d) => d.slug === slug);
  if (dataset) {
    return dataset.data;
  }
  // Check child datasets
  dataset = (cachedChildDatasets || []).find((d) => d.slug === slug);
  if (dataset) {
    return dataset.data;
  }

  throw new Error(`Dataset with slug "${slug}" not found in cached data`);
}

export function getCachedDatasetBySlugOrUuid(slugOrUuid: string): any {
  const { cachedDatasets, cachedChildDatasets } = loadCachedData();
  const datasetSlug = (cachedDatasets || []).find((d) => d.slug === slugOrUuid);
  if (datasetSlug) {
    return datasetSlug.data;
  }
  const dataset = (cachedChildDatasets || []).find(
    (d) => d.slug === slugOrUuid
  );
  if (dataset) {
    return dataset.data;
  }
  throw new Error(
    `Dataset with slug or UUID "${slugOrUuid}" not found in cached data`
  );
}
