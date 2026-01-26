import ItemsPageClient from "./ItemsPageClient";
import {
  getCachedDatasetsWithUuids,
  getCachedStudiesWithUuids,
  getCachedChildDatasetsForStudy,
} from "@/services/cachedData";

// Required for static export - pre-generate all item routes so GitHub Pages serves HTML files
// The client component will still fetch real data, but we need the HTML files to exist
export async function generateStaticParams() {
  try {
    const params: Array<{ slug: string[] }> = [];
    
    // Get all datasets and studies
    const datasetsWithUuids = getCachedDatasetsWithUuids();
    const studiesWithUuids = getCachedStudiesWithUuids();
    
    // Add all datasets by slug and UUID
    for (const dataset of datasetsWithUuids) {
      if (dataset.slug) {
        params.push({ slug: [dataset.slug] });
      }
      if (dataset.uuid) {
        params.push({ slug: [dataset.uuid] });
      }
    }
    
    // Add all child datasets from studies
    for (const study of studiesWithUuids) {
      try {
        const childDatasets = getCachedChildDatasetsForStudy(study.uuid);
        for (const childDataset of childDatasets) {
          if (childDataset.slug) {
            params.push({ slug: [childDataset.slug] });
          }
          if (childDataset.uuid) {
            params.push({ slug: [childDataset.uuid] });
          }
        }
      } catch (error) {
        // Skip if child datasets not available
        console.warn(`Failed to get child datasets for study ${study.uuid}:`, error);
      }
    }
    
    console.log(`📄 Generating ${params.length} item routes for static export`);
    return params;
  } catch (error) {
    console.error("Failed to generate static params for items:", error);
    // Return empty array as fallback
    return [];
  }
}

export default function ItemsPage() {
  return <ItemsPageClient />;
}
