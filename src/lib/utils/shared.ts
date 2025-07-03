/**
 * Utility functions shared between client and server components
 */

// Map organization names to their abbreviations for logo lookup
export const organizationAbbreviations: Record<string, string> = {
  // Government bodies
  "Office for National Statistics": "ONS",
  "National Health Service": "NHS",
  "Department for Education": "DfE",
  "Department of Health": "DoH",
  "Department of Health and Social Care": "DHSC",
  "Medical Research Council": "MRC",
  "National Institute for Health and Care Excellence": "NICE",
  "National Institute for Health Research": "NIHR",

  // Research councils
  "Economic and Social Research Council": "ESRC",
  "Arts and Humanities Research Council": "AHRC",
  "Biotechnology and Biological Sciences Research Council": "BBSRC",
  "Engineering and Physical Sciences Research Council": "EPSRC",
  "Natural Environment Research Council": "NERC",
  "Science and Technology Facilities Council": "STFC",
  "UK Research and Innovation": "UKRI",

  // Universities
  "University College London": "UCL",
  "University of Oxford": "Oxford",
  "University of Cambridge": "Cambridge",
  "Imperial College London": "Imperial",
  "King's College London": "KCL",
  "London School of Economics": "LSE",
  "Edinburgh University": "Edin",
  "University of Manchester": "Manchester",
  "University of Bristol": "Bristol",
  "University of Warwick": "Warwick",

  // International organizations
  "World Health Organization": "WHO",
  "United Nations": "UN",
  "European Union": "EU_flag",
  "Organisation for Economic Co-operation and Development": "OECD",

  // Charities and foundations
  "Wellcome Trust": "Wellcome",
  "Nuffield Foundation": "Nuffield",
  "British Heart Foundation": "BHF",
  "Cancer Research UK": "CRUK",
  "Alzheimer's Society": "Alzheimer",
  "Diabetes UK": "Diabetes",

  // Other common abbreviations
  "National Institute of Mental Health": "NIMH",
  "National Institutes of Health": "NIH",
  "Centers for Disease Control and Prevention": "CDC",
  "Social Care Institute for Excellence": "SCIE",
};

// Direct mapping of abbreviations to their logo paths
// This helps when we directly get abbreviations instead of full names
export const abbreviationToLogo: Record<string, string> = {
  // UK Research Councils and Funders
  MRC: "/logos/MRC.png",
  ESRC: "/logos/ESRC.png",
  UKRI: "/logos/UKRI.png",
  NERC: "/logos/NERC.png",
  STFC: "/logos/STFC.png",
  AHRC: "/logos/AHRC.png",
  BBSRC: "/logos/BBSRC.png",
  EPSRC: "/logos/EPSRC.png",
  NIHR: "/logos/NIHR.png",
  BHF: "/logos/BHF.png",
  CRUK: "/logos/CRUK.png",
  Wellcome: "/logos/Wellcome.png",
  Nuffield: "/logos/Nuffield.png",

  // UK Government and Public Bodies
  ONS: "/logos/ONS.png",
  NHS: "/logos/NHS.png",
  DfE: "/logos/DfE.png",
  DHSC: "/logos/DHSC.png",
  DoHSC: "/logos/DHSC.png", // Department of Health and Social Care (alternative abbr)
  NICE: "/logos/NICE.png",
  SCIE: "/logos/SCIE.png",
  HOUK: "/logos/HOUK.png", // Help the Hospices UK

  // UK Universities
  UCL: "/logos/UCL.png",
  Oxford: "/logos/Oxford.png",
  Cambridge: "/logos/Cambridge.png",
  Imperial: "/logos/Imperial.png",
  KCL: "/logos/KCL.png",
  LSE: "/logos/LSE.png",
  Edin: "/logos/Edin.png",

  // US Organizations
  NIH: "/logos/NIH.png",
  NIMH: "/logos/NIMH.png",
  NIDA: "/logos/NIDA.png", // National Institute on Drug Abuse
  NIAAA: "/logos/NIAAA.png", // National Institute on Alcohol Abuse and Alcoholism
  NSF: "/logos/NSF.png", // National Science Foundation
  CDC: "/logos/CDC.png",
  FDA: "/logos/FDA.png", // Food and Drug Administration

  // EU and European Organizations
  EU_flag: "/logos/EU_flag.png",
  EUCom: "/logos/EUCom.png", // European Commission
  ERC: "/logos/ERC.png", // European Research Council
  H2020: "/logos/H2020.png", // Horizon 2020
  HorizonEU: "/logos/HorizonEU.png", // Horizon Europe

  // Other International Organizations
  WHO: "/logos/WHO.png",
  VR: "/logos/VR.png", // Swedish Research Council (Vetenskapsrådet)
  BMBF: "/logos/BMBF.png", // German Federal Ministry of Education and Research
  DFG: "/logos/DFG.png", // German Research Foundation
  CNRS: "/logos/CNRS.png", // French National Centre for Scientific Research
  INSERM: "/logos/INSERM.png", // French National Institute of Health and Medical Research
  ARC: "/logos/ARC.png", // Australian Research Council
  NHMRC: "/logos/NHMRC.png", // Australian National Health and Medical Research Council
  CIHR: "/logos/CIHR.png", // Canadian Institutes of Health Research

  // Common Abbreviations for Organization Types
  Uni: "/logos/university.png", // Generic University
  Hosp: "/logos/hospital.png", // Generic Hospital
  Gov: "/logos/government.png", // Generic Government
  NGO: "/logos/ngo.png", // Generic NGO
  Charity: "/logos/charity.png", // Generic Charity

  // Additional CMHM specific abbreviations
  Rayne: "/logos/Rayne.png", // Rayne Foundation
  SRFound: "/logos/SRFound.png", // Sir Ratan Tata & Navajbai Ratan Tata Trust Foundation
  BCTrust: "/logos/BCTrust.png", // Burdett Trust for Nursing
  UKHF: "/logos/UKHF.png", // UK Health Forum
  RCN: "/logos/RCN.png", // Royal College of Nursing
  KingsFund: "/logos/KingsFund.png", // The King's Fund
  MHRN: "/logos/MHRN.png", // Mental Health Research Network
  McPF: "/logos/McPF.png", // McPin Foundation
  BLF: "/logos/BLF.png", // British Lung Foundation
  CLAHRC: "/logos/CLAHRC.png", // Collaboration for Leadership in Applied Health Research and Care
  TNA: "/logos/TNA.png", // The Nursinig & Midwifery Council
  NAO: "/logos/NAO.png", // National Audit Office
  RCP: "/logos/RCP.png", // Royal College of Physicians
  SU: "/logos/SU.png", // Swansea University
  SLaM: "/logos/SLaM.png", // South London and Maudsley NHS Foundation Trust
};

/**
 * Attempts to find a logo for an organization name
 * @param organizationName The name of the organization to find a logo for
 * @param providedLogo An optional logo path that takes precedence if provided
 * @returns The path to the logo, or undefined if no logo could be found
 */
export function findOrganizationLogo(
  organizationName?: string,
  providedLogo?: string
): string | undefined {
  // If a logo is directly provided, use that
  if (providedLogo && providedLogo.trim().length > 0) {
    console.log(
      `Using provided logo for ${
        organizationName || "Unknown"
      }: ${providedLogo}`
    );
    return providedLogo;
  }

  // If no organization name is provided, we can't find a logo
  if (!organizationName || organizationName.trim().length === 0) {
    console.log("No organization name provided to findOrganizationLogo");
    return undefined;
  }

  // Check if the organization name is actually a space-delimited list of abbreviations
  // (This is for handling cases like "MRC ESRC" where we get abbreviations directly)
  if (
    organizationName.includes(" ") &&
    organizationName.split(" ").every((part) => part.length <= 6)
  ) {
    console.log(
      `Organization name "${organizationName}" appears to be a space-delimited list of abbreviations`
    );
    // Split the string by spaces and try to find a logo for each part
    const parts = organizationName
      .split(" ")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    for (const part of parts) {
      // Check if this abbreviation has a direct logo mapping
      if (abbreviationToLogo[part]) {
        console.log(
          `Found direct logo match for abbreviation "${part}": ${abbreviationToLogo[part]}`
        );
        return abbreviationToLogo[part];
      }

      // If not, check if this part matches any known abbreviation by partial matching
      for (const [knownName, abbr] of Object.entries(
        organizationAbbreviations
      )) {
        if (
          knownName.toLowerCase().includes(part.toLowerCase()) ||
          abbr.toLowerCase() === part.toLowerCase()
        ) {
          const logoPath = `/logos/${abbr}.png`;
          console.log(
            `Found partial match for "${part}" with known organization "${knownName}" (${abbr}): ${logoPath}`
          );
          return logoPath;
        }
      }
    }

    console.log(`No logo match found for any part of "${organizationName}"`);
    return undefined; // Return undefined instead of default.png
  }

  // First check if there's a direct match in our abbreviation mapping
  const abbr = organizationAbbreviations[organizationName];
  if (abbr) {
    const logoPath = `/logos/${abbr}.png`;
    console.log(
      `Found direct organization match for "${organizationName}": ${logoPath}`
    );
    return logoPath;
  }

  // If not a direct match, check if the abbreviation itself is directly mapped to a logo
  if (abbreviationToLogo[organizationName]) {
    console.log(
      `Found direct logo match for organization abbreviation "${organizationName}": ${abbreviationToLogo[organizationName]}`
    );
    return abbreviationToLogo[organizationName];
  }

  // Next, check if any known organization name is contained within the provided name
  // For example, if the name is "University of Oxford Department of Psychology",
  // we want to match it to "University of Oxford"
  for (const [knownName, abbr] of Object.entries(organizationAbbreviations)) {
    if (
      organizationName.toLowerCase().includes(knownName.toLowerCase()) ||
      organizationName.toLowerCase().includes(abbr.toLowerCase())
    ) {
      const logoPath = `/logos/${abbr}.png`;
      console.log(
        `Found partial match for "${organizationName}" with known organization "${knownName}": ${logoPath}`
      );
      return logoPath;
    }
  }

  console.log(`No logo match found for "${organizationName}"`);
  // If no match is found, return undefined instead of a default logo
  return undefined;
}

/**
 * Get the asset prefix for components
 * This works for both server and client components
 */
export function getAssetPrefix(): string {
  // Check if we're building for GitHub Pages deployment
  if (process.env.GITHUB_PAGES_DEPLOYMENT === "true") {
    return "/search";
  }
  // For client components, we can check if we're in a browser environment
  if (typeof window !== "undefined") {
    // In the browser, we can check the current path to determine if we're in production
    const isProduction = window.location.pathname.startsWith("/search");
    return isProduction ? "/search" : "";
  }
  // Fallback
  return process.env.NEXT_PUBLIC_ASSET_PREFIX || "";
}
