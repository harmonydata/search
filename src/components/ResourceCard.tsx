"use client";

import { Card, CardContent, Typography, Box, Chip, Divider } from "@mui/material";

export interface ResourceData {
  all_text?: string;
  age_lower?: number;
  age_upper?: number;
  country_codes?: string[];
  country?: string;
  data_access?: string;
  description?: string;
  doi?: string;
  duration_years?: number;
  end_year?: number;
  funders?: string;
  genetic_data_collected?: boolean;
  geographic_coverage?: string;
  id?: string;
  institution?: string;
  instruments?: string[];
  language_codes?: string[];
  num_variables?: number;
  num_sweeps?: number;
  original_source_url?: string;
  owner?: string;
  question?: string;
  response_options?: string[];
  resource_type?: string;
  sample_size?: number;
  sex?: string;
  source?: string;
  start_year?: number;
  study_design?: string[];
  title?: string;
  topics?: string[];
  url?: string;
  study_variable_relationship?: any;
  score?: number;
  dataset_schema?: {
    "@context"?: string;
    "@type"?: string;
    name?: string;
    description?: string;
    url?: string[];
    keywords?: string[];
    identifier?: string[];
    variableMeasured?: {
      name: string;
      description?: string;
    }[];
    includedInDataCatalog?: {
      "@type"?: string;
      name?: string;
      url?: string;
      image?: string;
    }[];
    funder?: {
      "@type"?: string;
      name?: string;
    }[];
    publisher?: {
      "@type"?: string;
      name?: string;
    }[];
    creator?: {
      "@type"?: string;
      name?: string;
    }[];
    temporalCoverage?: string;
  };
  extra_data?: {
    country_codes?: string[];
    study_design?: string[];
    age_upper?: number;
    age_lower?: number;
    uuid?: string;
  };
  distance?: number;
  cosine_similarity?: number;
  match_type?: string[];
  variables_which_matched?: {
    name: string;
    description?: string;
    uuid?: string;
  }[];
  resultIndex?: number;
}

interface ResourceCardProps {
  resource: ResourceData;
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  const title = resource.dataset_schema?.name || resource.title || "Untitled Resource";
  const description = resource.dataset_schema?.description || resource.description || "";
  
  const funders = resource.dataset_schema?.funder 
    ? resource.dataset_schema.funder.map(f => f.name).join(", ") 
    : resource.funders;
  
  const publisher = resource.dataset_schema?.publisher 
    ? resource.dataset_schema.publisher.map(p => p.name).join(", ") 
    : resource.owner || resource.institution;
  
  const ageUpper = resource.extra_data?.age_upper ?? resource.age_upper;
  const ageLower = resource.extra_data?.age_lower ?? resource.age_lower;
  
  const urls = resource.dataset_schema?.url || (resource.url ? [resource.url] : []);
  
  const countryCodes = resource.extra_data?.country_codes || resource.country_codes || [];
  
  const studyDesign = resource.extra_data?.study_design || resource.study_design || [];
  
  const unfilteredKeywords = resource.dataset_schema?.keywords || resource.topics || [];
  
  // Filter out malformed keywords/topics that contain HTML fragments
  const keywords = unfilteredKeywords.filter(
    (keyword: any) => typeof keyword === 'string' && !keyword.includes('<a title=') && !keyword.startsWith('<')
  );

  const isDataset = (resource.dataset_schema?.["@type"] === "Dataset" || 
                     resource.resource_type?.toLowerCase() === "dataset");
  
  const isVariable = (resource.dataset_schema?.["@type"] === "Property" || 
                      resource.resource_type?.toLowerCase() === "variable");

  return (
    <Card sx={{ marginBottom: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        
        {description && (
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}

        {resource.cosine_similarity && (
          <Chip 
            size="small" 
            label={`Relevance: ${Math.round(resource.cosine_similarity * 100)}%`} 
            color="primary" 
            variant="outlined"
            sx={{ mb: 2 }}
          />
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          {(resource.id || resource.extra_data?.uuid) && (
            <Typography variant="body2">
              <strong>ID:</strong> {resource.id || resource.extra_data?.uuid}
            </Typography>
          )}

          {(resource.dataset_schema?.["@type"] || resource.resource_type) && (
            <Typography variant="body2">
              <strong>Type:</strong> {resource.dataset_schema?.["@type"] || resource.resource_type}
            </Typography>
          )}

          {(ageLower !== undefined || ageUpper !== undefined) && (
            <Typography variant="body2">
              <strong>Age Range:</strong> {ageLower !== undefined ? ageLower : 'N/A'} - {ageUpper !== undefined ? ageUpper : 'N/A'}
            </Typography>
          )}

          {(resource.dataset_schema?.temporalCoverage || resource.start_year || resource.end_year) && (
            <Typography variant="body2">
              <strong>Time Period:</strong> {resource.dataset_schema?.temporalCoverage || 
                `${resource.start_year || 'N/A'} to ${resource.end_year || 'N/A'}`}
            </Typography>
          )}

          {resource.duration_years !== undefined && (
            <Typography variant="body2">
              <strong>Duration (years):</strong> {resource.duration_years}
            </Typography>
          )}

          {countryCodes.length > 0 && (
            <Typography variant="body2">
              <strong>Countries:</strong> {countryCodes.join(", ")}
            </Typography>
          )}

          {resource.language_codes && resource.language_codes.length > 0 && (
            <Typography variant="body2">
              <strong>Languages:</strong> {resource.language_codes.join(", ")}
            </Typography>
          )}

          {resource.geographic_coverage && (
            <Typography variant="body2">
              <strong>Geographic Coverage:</strong> {resource.geographic_coverage}
            </Typography>
          )}

          {publisher && (
            <Typography variant="body2">
              <strong>Publisher:</strong> {publisher}
            </Typography>
          )}

          {funders && (
            <Typography variant="body2">
              <strong>Funders:</strong> {funders}
            </Typography>
          )}

          {isDataset && resource.sample_size !== undefined && (
            <Typography variant="body2">
              <strong>Sample Size:</strong> {resource.sample_size}
            </Typography>
          )}

          {isDataset && studyDesign.length > 0 && (
            <Typography variant="body2">
              <strong>Study Design:</strong> {studyDesign.join(", ")}
            </Typography>
          )}

          {isDataset && resource.num_variables !== undefined && (
            <Typography variant="body2">
              <strong>Number of Variables:</strong> {resource.num_variables}
            </Typography>
          )}

          {isDataset && resource.num_sweeps !== undefined && (
            <Typography variant="body2">
              <strong>Number of Sweeps:</strong> {resource.num_sweeps}
            </Typography>
          )}

          {isVariable && resource.question && (
            <Typography variant="body2" sx={{ gridColumn: "1 / span 2" }}>
              <strong>Question:</strong> {resource.question}
            </Typography>
          )}

          {isVariable && resource.response_options && resource.response_options.length > 0 && (
            <Typography variant="body2" sx={{ gridColumn: "1 / span 2" }}>
              <strong>Response Options:</strong> {resource.response_options.join(", ")}
            </Typography>
          )}
        </Box>

        {urls.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>URLs:</strong>
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {urls.map((url, index) => (
                <Chip
                  key={index}
                  label={url.length > 30 ? `${url.substring(0, 30)}...` : url}
                  component="a"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  clickable
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        {keywords.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Keywords:</strong>
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {keywords.map((keyword, index) => (
                <Chip
                  key={index}
                  label={keyword}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        {isDataset && resource.dataset_schema?.variableMeasured && resource.dataset_schema.variableMeasured.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Variables:</strong> {resource.dataset_schema.variableMeasured.length} total
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {resource.dataset_schema.variableMeasured.slice(0, 10).map((variable, index) => (
                <Chip
                  key={index}
                  label={variable.name}
                  size="small"
                  variant="outlined"
                  title={variable.description}
                />
              ))}
              {resource.dataset_schema.variableMeasured.length > 10 && (
                <Chip
                  label={`+${resource.dataset_schema.variableMeasured.length - 10} more`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
