"use client";

import { Box, Card, Typography } from "@mui/material";
import Image from "next/image";

interface OrganizationCardProps {
  name: string;
  url?: string;
  logo?: string;
}

export default function OrganizationCard({ name, url, logo }: OrganizationCardProps) {
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
            maxHeight: '3.6em', // Approximately 3 lines of text (1.2em line-height × 3)
            wordBreak: 'break-word'
          }}
        >
          {name}
        </Typography>
       
      </Box>
      
      {/* Logo section - only shown if logo exists */}
      {logo && logo.length > 0 && (
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
            src={logo}
            alt={name}
            width={50}
            height={50}
            style={{ objectFit: "contain" }}
            unoptimized={true}
          />
        </Box>
      )}
    </Card>
  );
} 