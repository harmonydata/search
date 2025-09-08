import { SearchResult } from "@/services/api";

export function transformSearchResultToDatasetDetail(result: SearchResult) {
  const title =
    result.dataset_schema?.name ||
    result.extra_data?.name ||
    "Untitled Dataset";
  const description =
    result.dataset_schema?.description || result.extra_data?.description || "";
  const image = (result.dataset_schema as any)?.image || (result as any).image;

  // Extract publisher
  const publisher = result.dataset_schema?.publisher?.[0]
    ? {
        name: result.dataset_schema.publisher[0].name || "Unknown Publisher",
        url: (result.dataset_schema.publisher[0] as any)?.url,
        logo: (result.dataset_schema.publisher[0] as any)?.logo,
      }
    : undefined;

  // Extract funders
  const funders = result.dataset_schema?.funder?.map((funder) => ({
    name: funder.name || "Funding Organization",
    url: (funder as any)?.url,
    logo: (funder as any)?.logo,
  }));

  // Geographic coverage
  const geographicCoverage =
    result.extra_data?.country_codes?.join(", ") ||
    (result as any).geographic_coverage;

  // Temporal coverage
  const temporalCoverage =
    result.dataset_schema?.temporalCoverage ||
    (result as any).temporal_coverage;

  // Age coverage
  const ageLower = result.extra_data?.age_lower ?? (result as any).age_lower;
  const ageUpper = result.extra_data?.age_upper ?? (result as any).age_upper;
  const ageCoverage =
    ageLower !== undefined && ageUpper !== undefined
      ? `${ageLower} - ${ageUpper} years`
      : ageLower !== undefined
      ? `${ageLower}+ years`
      : ageUpper !== undefined
      ? `0 - ${ageUpper} years`
      : undefined;

  // Study design
  const studyDesign =
    result.extra_data?.study_design || (result as any).study_design || [];

  // Resource type
  const resourceType =
    result.extra_data?.resource_type ||
    result.dataset_schema?.["@type"] ||
    (result as any).resource_type;

  // Topics (keywords)
  const topics =
    result.dataset_schema?.keywords?.filter(
      (topic: any) =>
        typeof topic === "string" &&
        !topic.includes("<a title=") &&
        !topic.startsWith("<")
    ) || [];

  // Instruments
  const instruments =
    (result as any).instruments || (result.extra_data?.instruments ?? []);

  // Data catalogs
  const dataCatalogs = result.dataset_schema?.includedInDataCatalog?.map(
    (catalog) => ({
      name: catalog.name || "Data Catalog",
      url: catalog.url,
      logo: catalog.image,
    })
  );

  // Variables
  const matchedVariables = result.variables_which_matched || [];
  const allVariables = result.dataset_schema?.variableMeasured || [];

  // Additional links
  const additionalLinks: string[] = [];
  if (result.dataset_schema?.url) {
    additionalLinks.push(...result.dataset_schema.url);
  }
  if (result.dataset_schema?.identifier) {
    result.dataset_schema.identifier.forEach((id) => {
      if (id.startsWith("http://") || id.startsWith("https://")) {
        additionalLinks.push(id);
      } else if (id.startsWith("10.") && id.includes("/")) {
        additionalLinks.push(`https://doi.org/${id}`);
      }
    });
  }
  // Add DOIs from extra_data if present
  if (Array.isArray(result.extra_data?.dois)) {
    result.extra_data.dois.forEach((doi) => {
      if (typeof doi === "string" && doi.startsWith("http")) {
        additionalLinks.push(`${doi}`);
      }
    });
  }

  // Pass through child_datasets if present
  const child_datasets = (result as any).child_datasets || [];

  return {
    title,
    description,
    image,
    publisher,
    funders,
    geographicCoverage,
    temporalCoverage,
    ageCoverage,
    studyDesign,
    resourceType,
    topics,
    instruments,
    dataCatalogs,
    matchedVariables,
    allVariables,
    additionalLinks,
    child_datasets,
  };
}
