// Per-source credit text and logo rules, keyed by source_id (as used by
// /discover/sources and extra_data.source).
//
// Fallback for when the discovery API doesn't send these fields, which is
// always today. The `attribution` objects mirror the shape proposed for
// /discover/sources; once the API sends them, the API should win.
//
// Wording and statuses come from SOURCE_ATTRIBUTION_HANDOFF.md (harmonydiscovery,
// 2026-10-08). Rows marked "required" are verbatim: don't paraphrase them.

export interface SourceAttribution {
  // {date}, {year}, {publisher} and {publisherName} are filled per record.
  // A clause whose placeholder has no value is dropped.
  credit_text: string;
  // licence_name appears in credit_text and is linked to licence_url
  licence_name?: string;
  licence_url?: string;
  // required: mandated by the source's terms; requested: the source asks for
  // it; proposed: no wording prescribed, to confirm with the source
  status: "required" | "requested" | "proposed";
  logo_approved: boolean;
}

export interface SourceConfig {
  name: string;
  // includedInDataCatalog names and link hosts (subdomains match), to tell
  // which source a catalogue card or link belongs to
  catalogueNames: string[];
  catalogueHosts: string[];
  // Interim logo until logo_approved: this domain's favicon from Google's
  // favicon service. null = no logo.
  faviconDomain: string | null;
  // Placeholder values that don't come from the record
  placeholders?: Record<string, string>;
  attribution: SourceAttribution;
}

export const SOURCES: Record<string, SourceConfig> = {
  closer: {
    name: "CLOSER",
    catalogueNames: ["CLOSER Discovery"],
    catalogueHosts: ["closer.ac.uk"],
    // Excluded: CLOSER's terms require prior approval to use their logo
    faviconDomain: null,
    // Harvest year, until the API exposes each record's Colectica VersionDate
    placeholders: { date: "2026" },
    attribution: {
      credit_text:
        "CLOSER {date}. This CLOSER resource is licensed under the Non-Commercial Government Licence v2.0, except where otherwise stated. Our use of this metadata does not imply endorsement by CLOSER.",
      licence_name: "Non-Commercial Government Licence v2.0",
      licence_url:
        "https://www.nationalarchives.gov.uk/doc/non-commercial-government-licence/version/2/",
      status: "required",
      logo_approved: false,
    },
  },
  ukds: {
    name: "UK Data Service",
    catalogueNames: ["UK Data Service"],
    catalogueHosts: ["ukdataservice.ac.uk"],
    faviconDomain: "ukdataservice.ac.uk",
    attribution: {
      credit_text:
        "Metadata sourced from the UK Data Service, derived from original data producer submissions. Its reuse does not imply endorsement by the UK Data Service, the original data producers, rights holders or contributing organisations.",
      status: "required",
      logo_approved: false,
    },
  },
  ukllc: {
    name: "UK Longitudinal Linkage Collaboration",
    catalogueNames: ["UK Longitudinal Linkage Collaboration: UK LLC"],
    catalogueHosts: ["ukllc.ac.uk"],
    faviconDomain: "ukllc.ac.uk",
    attribution: {
      credit_text:
        "Metadata © 2020–2024 UK Longitudinal Linkage Collaboration and contributors, licensed under CC BY-NC-SA 4.0. Adapted by Harmony; adaptations are shared under the same licence.",
      licence_name: "CC BY-NC-SA 4.0",
      licence_url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      status: "required",
      logo_approved: false,
    },
  },
  hdruk: {
    name: "Health Data Research Gateway",
    catalogueNames: ["Health Data Research Innovation Gateway"],
    catalogueHosts: ["healthdatagateway.org", "hdruk.ac.uk"],
    faviconDomain: "hdruk.ac.uk",
    // Year accessed
    placeholders: { year: "2026" },
    attribution: {
      // Wording from HDR UK's Attribution Policy v4, not re-verified
      credit_text:
        "Data discovery and access was facilitated by the Health Data Research Gateway {year}. https://doi.org/10.57774/jrjz-mn46. Dataset metadata provided by {publisherName}.",
      status: "required",
      logo_approved: false,
    },
  },
  mhc: {
    name: "Catalogue of Mental Health Measures",
    catalogueNames: ["Catalogue of Mental Health Measures"],
    catalogueHosts: ["cataloguementalhealth.ac.uk"],
    faviconDomain: "cataloguementalhealth.ac.uk",
    attribution: {
      credit_text:
        "Catalogue of Mental Health Measures (2026). Available at www.cataloguementalhealth.ac.uk",
      status: "requested",
      logo_approved: false,
    },
  },
  cls: {
    name: "UCL Centre for Longitudinal Studies",
    catalogueNames: ["UCL Centre for Longitudinal Studies"],
    catalogueHosts: ["cls.ucl.ac.uk"],
    faviconDomain: "cls.ucl.ac.uk",
    attribution: {
      credit_text:
        "Metadata from the UCL Centre for Longitudinal Studies (cls.ucl.ac.uk). © UCL. Reuse does not imply endorsement by UCL or CLS.",
      status: "proposed",
      logo_approved: false,
    },
  },
  adruk: {
    name: "ADR UK",
    catalogueNames: ["ADR UK"],
    catalogueHosts: ["adruk.org"],
    faviconDomain: "adruk.org",
    attribution: {
      credit_text:
        "Metadata from the ADR UK Data Catalogue (datacatalogue.adruk.org), originally published by {publisher}. Reuse does not imply endorsement by ADR UK.",
      status: "proposed",
      logo_approved: false,
    },
  },
};

// For a source with no entry above
export function genericCredit(name: string): string {
  return `Source: ${name}. Reuse does not imply endorsement by ${name}.`;
}

export function findSourceIdForCatalogue(
  name?: string,
  url?: string
): string | undefined {
  let host: string | undefined;
  try {
    host = url ? new URL(url).hostname.toLowerCase() : undefined;
  } catch {
    host = undefined;
  }
  return Object.keys(SOURCES).find((id) => {
    const source = SOURCES[id];
    return (
      (name !== undefined && source.catalogueNames.includes(name)) ||
      (host !== undefined &&
        source.catalogueHosts.some((h) => host === h || host.endsWith(`.${h}`)))
    );
  });
}

export function sourceLogo(id: string): string | undefined {
  const domain = SOURCES[id]?.faviconDomain;
  return domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    : undefined;
}

// extra_data.source is a list in the index but typed as a string
export function recordSourceIds(source: unknown): string[] {
  if (Array.isArray(source)) return source.filter((s) => typeof s === "string");
  return typeof source === "string" && source ? [source] : [];
}

// Removes the clause holding `token`: from the preceding comma, or else the
// whole sentence it sits in
function dropClause(text: string, token: string): string {
  const start = text.indexOf(token);
  const end = start + token.length;
  const comma = text.lastIndexOf(",", start);
  const sentenceStart = text.lastIndexOf(". ", start);
  if (comma > sentenceStart) return text.slice(0, comma) + text.slice(end);
  const sentenceEnd = text.indexOf(".", end);
  const before = sentenceStart >= 0 ? text.slice(0, sentenceStart + 1) : "";
  const after = sentenceEnd >= 0 ? text.slice(sentenceEnd + 1) : "";
  return (before + after).trim();
}

export function fillCreditText(
  template: string,
  values: Record<string, string | undefined>
): string {
  let text = template;
  for (const match of template.match(/\{\w+\}/g) ?? []) {
    const value = values[match.slice(1, -1)];
    text = value ? text.replace(match, value) : dropClause(text, match);
  }
  return text;
}

export function creditTextFor(
  id: string,
  record: { publisher?: string }
): string {
  const source = SOURCES[id];
  if (!source) return genericCredit(id);
  return fillCreditText(source.attribution.credit_text, {
    ...source.placeholders,
    publisher: record.publisher,
    publisherName: record.publisher,
  });
}
