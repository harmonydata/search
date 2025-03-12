"use client";

import { Box, CardContent, Typography } from "@mui/material";
import { SearchResult } from "@/services/api";
import Image from "next/image";
import { File, Database, FileText, Book } from "lucide-react";
import { useState } from "react";
import SquareChip from "@/components/SquareChip";

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
  
  // Check if data is available - Specifically when includedInDataCatalog exists
  const hasDataAvailable = result.dataset_schema?.includedInDataCatalog && 
                          result.dataset_schema.includedInDataCatalog.length > 0;
  
  // Truncate description to 3-4 lines (approx 200 characters)
  const truncatedDescription = description.length > 200 
    ? `${description.substring(0, 200)}...` 
    : description;
    
  // Determine if result has image
  // First check dataset_schema.includedInDataCatalog[].image
  let imageUrl = null;
  const [imageError, setImageError] = useState(false);
  
  // Get the specific image URL (not just the site logo)
  if (result.dataset_schema?.includedInDataCatalog && !imageError) {
    for (const catalog of result.dataset_schema.includedInDataCatalog) {
      if (catalog.image) {
        // Make sure we're getting the exact image specified, not just a generic site logo
        imageUrl = catalog.image;
        break;
      }
    }
  }
  
  // Fallback image based on resource type
  const getTypeIcon = () => {
    // Choose icon based on resource type
    if (resourceType.includes('dataset')) {
      return <Database size={48} />;
    } else if (resourceType.includes('variable')) {
      return <File size={48} />;
    } else if (resourceType.includes('study')) {
      return <Book size={48} />;
    } else {
      return <FileText size={48} />;
    }
  };
  
  return (
    <Box
      sx={{
        boxShadow: isSelected ? '0 0 0 2px rgba(25, 118, 210, 0.3)' : 'none',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: isSelected 
            ? '0 0 0 2px rgba(25, 118, 210, 0.3)' 
            : '0 2px 8px rgba(0, 0, 0, 0.08)'
        },
        background: 'transparent'
      }}
    >
      <Box 
        onClick={onClick}
        sx={{
          cursor: 'pointer',
          display: 'flex',
          width: '100%',
          background: 'transparent',
          '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' },
        }}
      >
        <Box sx={{ 
          width: 120, 
          minHeight: '100%',
          pt: 2, // Align with title
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start', // Align to top
          background: 'transparent',
          color: 'grey.500'
        }}>
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={title}
              width={100}
              height={100}
              style={{ objectFit: 'contain' }}
              onError={() => setImageError(true)}
              unoptimized={true}
            />
          ) : (
            getTypeIcon()
          )}
        </Box>
        
        <Box sx={{ 
          p: 2, 
          flex: 1,
          background: 'transparent',
        }}>
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
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 'auto' }}>
            {hasVariables && (
              <SquareChip 
                chipVariant="primary"
                size="small"
              >
                {variablesCount > 0 ? `${variablesCount} Variables` : "Has Variables"}
              </SquareChip>
            )}
            
            {hasDataAvailable && (
              <SquareChip 
                chipVariant="secondary"
                size="small"
              >
                Data Available
              </SquareChip>
            )}
            
            {result.hasFreeAccess && (
              <SquareChip 
                chipVariant="secondary"
                size="small"
              >
                Free Access
              </SquareChip>
            )}
            
            {result.hasCohortsAvailable && (
              <SquareChip 
                chipVariant="secondary"
                size="small"
              >
                Cohorts Available
              </SquareChip>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
} 