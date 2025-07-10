"use client";

import { useState, useEffect } from "react";
import { Card, Box, Typography, Skeleton, CardContent } from "@mui/material";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { fetchOgData } from "@/services/api";

// Global request throttling mechanism
// Keep track of URLs that are currently being fetched
const inFlightRequests = new Map<string, Promise<any>>();
// Keep track of the results of recent requests for reuse
const resultCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface OpenGraphData {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
  type: string;
  favicon: string;
  originalUrl?: string;
  finalUrl?: string;
  isFallback?: boolean;
  publisher?: string;
}

interface LinkPreviewCardProps {
  url: string;
  compact?: boolean;
  maxHeight?: number;
}

export default function LinkPreviewCard({
  url,
  compact = false,
  maxHeight = 250,
}: LinkPreviewCardProps) {
  const [ogData, setOgData] = useState<OpenGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    async function fetchOpenGraphData() {
      if (!url) return;

      setLoading(true);
      setError(null);
      setImageError(false);

      try {
        // Check if the URL is already cached client-side
        const cacheKey = url.toLowerCase();
        const now = Date.now();
        const cachedResult = resultCache.get(cacheKey);

        if (cachedResult && now - cachedResult.timestamp < CACHE_TTL) {
          // Use cached result
          console.log(`Client cache hit for ${url}`);
          setOgData(cachedResult.data);
          setLoading(false);
          return;
        }

        // Check if there's already a request in flight for this URL
        let requestPromise = inFlightRequests.get(cacheKey);

        if (!requestPromise) {
          // Create a new request if none exists
          console.log(`Fetching OpenGraph data for ${url}`);
          requestPromise = fetchOgData(url)
            .then((data) => {
              // Cache the result
              resultCache.set(cacheKey, { data, timestamp: Date.now() });
              return data;
            })
            .finally(() => {
              // Remove from in-flight requests when done
              inFlightRequests.delete(cacheKey);
            });

          // Add to in-flight requests
          inFlightRequests.set(cacheKey, requestPromise);
        } else {
          console.log(`Reusing in-flight request for ${url}`);
        }

        // Wait for the request to complete
        const data = await requestPromise;
        setOgData(data);
      } catch (err) {
        console.error("Error fetching Open Graph data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch link preview"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchOpenGraphData();
  }, [url]);

  const handleImageError = () => {
    setImageError(true);
  };

  if (error) {
    // Simplified error view - just show the URL as a link
    return (
      <Box
        component="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          textDecoration: "none",
          color: "primary.main",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          "&:hover": {
            textDecoration: "underline",
          },
        }}
      >
        <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
          {url}
        </Typography>
        <ExternalLink size={16} />
      </Box>
    );
  }

  if (loading) {
    return (
      <Card
        elevation={0}
        sx={{
          display: "flex",
          flexDirection: compact ? "row" : "column",
          borderRadius: "8px",
          overflow: "hidden",
          width: "100%",
          maxWidth: compact ? "100%" : 500,
          height: compact ? 100 : "auto",
          maxHeight: maxHeight,
          border: "1px solid",
          borderColor: "grey.200",
          transition: "all 0.2s",
        }}
      >
        {/* Image skeleton */}
        {!compact && (
          <Skeleton variant="rectangular" width="100%" height={140} />
        )}

        <Box
          sx={{
            flex: 1,
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Title skeleton */}
          <Skeleton variant="text" width="80%" height={24} />

          {/* Description skeleton - hidden in compact mode */}
          {!compact && (
            <Skeleton variant="text" width="90%" height={18} sx={{ mt: 1 }} />
          )}

          {/* Site info skeleton */}
          <Box sx={{ display: "flex", alignItems: "center", mt: 1, gap: 1 }}>
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton variant="text" width={120} height={16} />
          </Box>
        </Box>

        {/* Favicon skeleton for compact mode */}
        {compact && <Skeleton variant="rectangular" width={80} height="100%" />}
      </Card>
    );
  }

  if (!ogData) {
    return null;
  }

  return (
    <Card
      elevation={0}
      sx={{
        display: "flex",
        flexDirection: compact ? "row" : "column",
        borderRadius: "8px",
        overflow: "hidden",
        width: "100%",
        maxWidth: compact ? "100%" : 500,
        height: compact ? 100 : "auto",
        maxHeight: maxHeight,
        border: "1px solid",
        borderColor: ogData.isFallback ? "grey.300" : "grey.200",
        cursor: "pointer",
        transition: "all 0.2s",
        opacity: ogData.isFallback ? 0.8 : 1,
        "&:hover": {
          boxShadow: 2,
          borderColor: ogData.isFallback ? "grey.400" : "primary.main",
        },
      }}
      onClick={() => {
        window.open(url, "_blank", "noopener,noreferrer");
      }}
    >
      {/* Image section */}
      {ogData.image && !imageError && !compact && (
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: 140,
            overflow: "hidden",
            bgcolor: "rgba(0,0,0,0.03)",
          }}
        >
          <Image
            src={ogData.image}
            alt={ogData.title || "Link preview"}
            fill
            style={{ objectFit: "cover" }}
            onError={handleImageError}
            unoptimized={true}
          />
        </Box>
      )}

      {/* Content section */}
      <Box
        sx={{
          flex: 1,
          p: 1.5,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          bgcolor: "rgba(0,0,0,0.01)",
        }}
      >
        <Box>
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{
              fontWeight: 500,
              fontSize: compact ? "0.9rem" : "1rem",
              lineHeight: 1.2,
              mb: 0.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {ogData.title}
          </Typography>

          {!compact && ogData.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: "0.8rem",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                mb: 1,
                height: "2.4em",
              }}
            >
              {ogData.description}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {ogData.favicon && (
            <Box
              sx={{
                width: 16,
                height: 16,
                position: "relative",
                overflow: "hidden",
                borderRadius: "2px",
                flexShrink: 0,
              }}
            >
              <Image
                src={ogData.favicon}
                alt={ogData.siteName || "Site icon"}
                width={16}
                height={16}
                style={{ objectFit: "contain" }}
                unoptimized={true}
              />
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
              fontSize: "0.7rem",
            }}
          >
            {ogData.isFallback && url.includes("doi.org")
              ? ogData.publisher || "DOI"
              : ogData.siteName ||
                new URL(ogData.finalUrl || ogData.url).hostname}
            {ogData.isFallback && " (preview unavailable)"}
          </Typography>

          <ExternalLink size={12} color="#666" style={{ marginLeft: "auto" }} />
        </Box>
      </Box>

      {/* Image section for compact mode */}
      {ogData.image && !imageError && compact && (
        <Box
          sx={{
            position: "relative",
            width: 80,
            minWidth: 80,
            height: "100%",
            overflow: "hidden",
            bgcolor: "rgba(0,0,0,0.03)",
          }}
        >
          <Image
            src={ogData.image}
            alt={ogData.title || "Link preview"}
            fill
            style={{ objectFit: "cover" }}
            onError={handleImageError}
            unoptimized={true}
          />
        </Box>
      )}
    </Card>
  );
}
