"use client";

import { Box, Card, CardActionArea, CardContent, Chip, Typography, CardMedia } from "@mui/material";
import { SearchResult } from "@/services/api";
import Image from "next/image";
import { File, Database, FileText, Book } from "lucide-react";

interface CompactResultCardProps {
  result: SearchResult;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function CompactResultCard({ result, isSelected, onClick }: CompactResultCardProps) {
  // Determine resource type from either dataset_schema.@type or resource_type
  let resourceType = '';
  if (result.dataset_schema && result.dataset_schema["@type"]) {
    resourceType = result.dataset_schema["@type"].toLowerCase();
  } else if (result.resource_type) {
    resourceType = result.resource_type.trim().toLowerCase();
  }
  
  // Extract title, description, and keywords
  const title = result.dataset_schema?.name || result.title || 'Unnamed Resource';
  const description = result.dataset_schema?.description || result.description || '';
  
  // Get keywords from either dataset_schema.keywords or result fields
  const keywords: string[] = result.dataset_schema?.keywords || 
                           (result as any).topics || 
                           [];
  
  // Get the variables count for the chip display
  const variablesCount = result.dataset_schema?.variableMeasured?.length || 0;
  const hasVariables = variablesCount > 0 || result.hasVariables;
  
  // Truncate description to 3-4 lines (approx 200 characters)
  const truncatedDescription = description.length > 200 
    ? `${description.substring(0, 200)}...` 
    : description;
    
  // Determine if result has image
  // First check dataset_schema.includedInDataCatalog[].image
  let imageUrl = null;
  if (result.dataset_schema?.includedInDataCatalog) {
    for (const catalog of result.dataset_schema.includedInDataCatalog) {
      if (catalog.image) {
        imageUrl = catalog.image;
        break;
      }
    }
  }
  
  // Fallback image based on resource type
  const getTypeIcon = () => {
    // Choose icon based on resource type
    if (resourceType.includes('dataset')) {
      return <Database size={36} />;
    } else if (resourceType.includes('variable')) {
      return <File size={36} />;
    } else if (resourceType.includes('study')) {
      return <Book size={36} />;
    } else {
      return <FileText size={36} />;
    }
  };
  
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        borderColor: isSelected ? 'primary.main' : 'grey.200',
        boxShadow: isSelected ? '0 0 0 2px rgba(25, 118, 210, 0.3)' : 'none',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }
      }}
    >
      <CardActionArea onClick={onClick} sx={{ display: 'flex', alignItems: 'stretch', p: 0 }}>
        <Box sx={{ display: 'flex', width: '100%' }}>
          {/* Image or Icon Container */}
          <Box sx={{ 
            width: 80, 
            height: '100%', 
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'grey.50',
            color: 'grey.500'
          }}>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={title}
                width={80}
                height={80}
                style={{ objectFit: 'contain' }}
              />
            ) : (
              getTypeIcon()
            )}
          </Box>
          
          <CardContent sx={{ p: 2, flex: 1, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  mb: 0.5, 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.2
                }}
              >
                {title}
              </Typography>
            </Box>
            
            {keywords.length > 0 && (
              <Typography 
                variant="body2" 
                sx={{ mb: 1, color: 'text.secondary' }}
              >
                {keywords.slice(0, 5).map((keyword: string, i: number) => (
                  <Box key={`${keyword}-${i}`} component="span">
                    <Box component="strong" sx={{ fontSize: '0.85rem' }}>
                      {keyword}
                    </Box>
                    {i < Math.min(keywords.length, 5) - 1 && (
                      <Box component="span" sx={{ mx: 0.5 }}>•</Box>
                    )}
                  </Box>
                ))}
              </Typography>
            )}
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.4,
                mb: 1.5
              }}
            >
              {truncatedDescription}
            </Typography>
            
            {/* Bottom chips for information like variables */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 'auto' }}>
              {/* Type indicator chip */}
              <Chip 
                label={resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} 
                size="small"
                sx={{ 
                  bgcolor: 'primary.50',
                  color: 'primary.dark',
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  height: '24px'
                }}
              />
              
              {/* Variables chip if available */}
              {hasVariables && (
                <Chip 
                  label={variablesCount > 0 ? `${variablesCount} Variables` : "Has Variables"} 
                  size="small"
                  sx={{ 
                    bgcolor: 'success.50',
                    color: 'success.dark',
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    height: '24px'
                  }}
                />
              )}
              
              {/* Add more chips for relevant metadata */}
              {result.hasFreeAccess && (
                <Chip 
                  label="Free Access" 
                  size="small"
                  sx={{ 
                    bgcolor: 'info.50',
                    color: 'info.dark',
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    height: '24px'
                  }}
                />
              )}
              
              {result.hasCohortsAvailable && (
                <Chip 
                  label="Cohorts Available" 
                  size="small"
                  sx={{ 
                    bgcolor: 'warning.50',
                    color: 'warning.dark',
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    height: '24px'
                  }}
                />
              )}
            </Box>
          </CardContent>
        </Box>
      </CardActionArea>
    </Card>
  );
} 