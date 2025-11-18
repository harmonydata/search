"use client";

import { QRCodeSVG } from "qrcode.react";
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";

interface ColoredQRCodeProps {
  url: string;
  title: string;
  size?: number;
}

// Simple hash function to generate consistent color from title
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Site color palette
const SITE_PALETTE = [
  "#0de5b2", // teal/cyan
  "#0f1854", // dark blue
  "#2b45ed", // blue
  "#00af54", // green
  "#aeb8fe", // light blue/lavender
  "#fb4d3d", // red/coral
];

// Generate a color from a hash value using site palette
function hashToColor(hash: number): string {
  const index = hash % SITE_PALETTE.length;
  return SITE_PALETTE[index];
}

export default function ColoredQRCode({
  url,
  title,
  size = 100,
}: ColoredQRCodeProps) {
  const color = useMemo(() => {
    const hash = hashString(title);
    return hashToColor(hash);
  }, [title]);

  const firstLetter = title.charAt(0).toUpperCase();
  const centerSize = size * 0.28; // 28% of QR code size for center

  return (
    <Box
      sx={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* QR Code */}
      <QRCodeSVG
        value={url}
        size={size}
        level="L"
        fgColor={color}
        bgColor="white"
      />
      {/* Central white box with letter overlay */}
      <Box
        sx={{
          position: "absolute",
          width: centerSize,
          height: centerSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "white",
          borderRadius: "4px",
          border: `2px solid ${color}`,
          zIndex: 1,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            color: color,
            fontSize: centerSize * 0.5,
            lineHeight: 1,
          }}
        >
          {firstLetter}
        </Typography>
      </Box>
    </Box>
  );
}
