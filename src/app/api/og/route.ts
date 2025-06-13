import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// Remove dynamic export for static builds - API routes won't work anyway in static export
// export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

// In-memory cache for OpenGraph data to prevent repeated fetches
// This will persist across requests while the server is running
const ogCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function GET(request: NextRequest) {
  // For static builds, return a placeholder response
  if (process.env.GITHUB_PAGES_DEPLOYMENT === "true") {
    return NextResponse.json({
      title: "Static Build - OG API Not Available",
      description: "This API endpoint is not available in static builds",
      image: "",
      url: "",
      siteName: "",
      type: "",
      favicon: "/favicon.ico",
    });
  }

  try {
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = url.toLowerCase();
    const cachedData = ogCache.get(cacheKey);
    const now = Date.now();

    // If we have cached data and it's not expired, use it
    if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
      console.log(`Cache hit for ${url}`);
      return NextResponse.json(cachedData.data);
    }

    console.log(`Cache miss for ${url}, fetching...`);

    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DiscoveryNext/1.0; +https://discoverynext.org)",
      },
      redirect: "follow", // Explicitly follow redirects
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the final URL after redirects
    const finalUrl = response.url || url;

    // Log redirect information for DOI links
    if (url.includes("doi.org") && finalUrl !== url) {
      console.log(`DOI redirect: ${url} -> ${finalUrl}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Open Graph data
    const ogData = {
      title:
        $('meta[property="og:title"]').attr("content") ||
        $("title").text() ||
        "",
      description:
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        "",
      image: $('meta[property="og:image"]').attr("content") || "",
      url: $('meta[property="og:url"]').attr("content") || finalUrl, // Use the final URL after redirects
      siteName: $('meta[property="og:site_name"]').attr("content") || "",
      type: $('meta[property="og:type"]').attr("content") || "",
      favicon:
        $('link[rel="icon"]').attr("href") ||
        $('link[rel="shortcut icon"]').attr("href") ||
        "/favicon.ico",
      originalUrl: url, // Store the original URL for reference
      finalUrl: finalUrl, // Store the final URL after redirects
    };

    // If no OG image is found, try to find the first image on the page
    if (!ogData.image) {
      const firstImage = $("img").first().attr("src");
      if (firstImage) {
        // Handle relative URLs
        try {
          ogData.image = new URL(firstImage, finalUrl).toString();
        } catch (e) {
          // If URL parsing fails, just use the original image URL
          ogData.image = firstImage;
        }
      }
    } else if (ogData.image && !ogData.image.startsWith("http")) {
      // Handle relative OG image URLs
      try {
        ogData.image = new URL(ogData.image, finalUrl).toString();
      } catch (e) {
        // If URL parsing fails, just use the original image URL
        console.error("Failed to parse OG image URL", e);
      }
    }

    // Handle relative favicon URLs
    if (ogData.favicon && !ogData.favicon.startsWith("http")) {
      try {
        ogData.favicon = new URL(ogData.favicon, finalUrl).toString();
      } catch (e) {
        // If URL parsing fails, just use the original favicon URL
        console.error("Failed to parse favicon URL", e);
      }
    }

    // Store in cache
    ogCache.set(cacheKey, { data: ogData, timestamp: now });

    return NextResponse.json(ogData);
  } catch (error) {
    console.error("Error fetching Open Graph data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Open Graph data" },
      { status: 500 }
    );
  }
}
