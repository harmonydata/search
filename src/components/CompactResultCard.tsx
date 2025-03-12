"use client";

import { Box, Card, CardActionArea, CardContent, Chip, Typography, CardMedia } from "@mui/material";
import { SearchResult } from "@/services/api";
import Image from "next/image";

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
  
  // Truncate description to 3-4 lines (approx 200 characters)
  const truncatedDescription = description.length > 200 
    ? `${description.substring(0, 200)}...` 
    : description;
    
  // Determine if we have an image
  const hasImage = false; // For now - would need to add logic if images are available
  
  // For demo purpose - in real implementation, would use actual images from the data
  const imagePlaceholder = {
    dataset: "/study-image-placeholder.jpg",
    study: "/study-image-placeholder.jpg",
    variable: "/variable-image-placeholder.jpg",
    source: "/source-image-placeholder.jpg"
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
          {hasImage && (
            <Box sx={{ width: 120, height: 120, flexShrink: 0, position: 'relative' }}>
              <CardMedia
                component="img"
                height="120"
                image={imagePlaceholder[resourceType as keyof typeof imagePlaceholder] || imagePlaceholder.dataset}
                alt={title}
                sx={{ objectFit: 'cover' }}
              />
            </Box>
          )}
          
          <CardContent sx={{ p: 2, flex: 1, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="h6" gutterBottom noWrap sx={{ mb: 0.5 }}>
                {title}
              </Typography>
            </Box>
            
            {keywords.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {keywords.slice(0, 6).map((keyword: string, i: number) => (
                  <Chip 
                    key={`${keyword}-${i}`} 
                    label={keyword} 
                    size="small" 
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.7rem', 
                      height: '1.6rem',
                      maxWidth: '120px',
                      '& .MuiChip-label': { 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap'
                      }
                    }}
                  />
                ))}
              </Box>
            )}
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.4
              }}
            >
              {truncatedDescription}
            </Typography>
          </CardContent>
        </Box>
      </CardActionArea>
    </Card>
  );
} 