"use client";

import { Box, Card, Typography } from "@mui/material";
import Image from "next/image";
import { findOrganizationLogo } from "@/lib/utils/shared";
import { useEffect, useState } from "react";

interface DataCatalogCardProps {
  name: string;
  url?: string;
  logo?: string;
}

export default function DataCatalogCard({ name, url, logo }: DataCatalogCardProps) {
  // State to track the resolved logo path
  const [resolvedLogo, setResolvedLogo] = useState<string | undefined>(logo);
  // State to track if there was an error loading the image
  const [hasImageError, setHasImageError] = useState(false);
  
  // Use effect to find the appropriate logo when the component mounts
  useEffect(() => {
   // console.log(`Resolving logo for data catalog: "${name}"`);
    try {
      const logoPath = findOrganizationLogo(name, logo);
      console.log(`Resolved logo for data catalog "${name}":`, logoPath);
      setResolvedLogo(logoPath);
      setHasImageError(false); // Reset error state when resolving a new logo
    } catch (error) {
      console.error(`Error resolving logo for data catalog "${name}":`, error);
      setResolvedLogo(undefined);
    }
  }, [name, logo]);

  // Handle image load error
  const handleImageError = () => {
    console.error(`Error loading image for data catalog "${name}" from path: ${resolvedLogo}`);
    setHasImageError(true);
  };

  // Determine if we should show the logo section
  const showLogoSection = resolvedLogo && resolvedLogo.length > 0 && !hasImageError;

  return (
    <Card
      elevation={0}
      sx={{
        display: "flex",
        borderRadius: "16px",
        overflow: "hidden",
        width: "280px",
        height: "80px",
        flexShrink: 0,
        border: "1px solid",
        borderColor: "grey.200",
        cursor: url ? 'pointer' : 'default',
        transition: 'all 0.2s',
        '&:hover': url ? {
          boxShadow: 2,
          borderColor: 'primary.main',
        } : {}
      }}
      onClick={() => {
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }}
    >
      {/* Content section - slightly darkened background */}
      <Box 
        sx={{ 
          flex: 1,
          bgcolor: "rgba(0,0,0,0.03)",
          p: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center"
        }}
      >
        <Typography 
          sx={{ 
            fontWeight: 500,
            fontSize: '0.9rem',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            maxHeight: '3.7em', // Approximately 3 lines of text (1.2em line-height × 3)
            wordBreak: 'break-word'
          }}
        >
          {name}
        </Typography>
        
      </Box>
      
      {/* Logo section - only show if logo exists and loads correctly */}
      {showLogoSection && (
        <Box 
          sx={{ 
            width: "30%",
            bgcolor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 1,
            borderLeft: "1px solid",
            borderColor: "grey.200"
          }}
        >
          <Image
            src={resolvedLogo}
            alt={name}
            width={50}
            height={50}
            style={{ objectFit: "contain" }}
            onError={handleImageError}
            unoptimized={true}
          />
        </Box>
      )}
    </Card>
  );
} 