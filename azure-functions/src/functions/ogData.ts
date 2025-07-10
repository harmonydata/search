import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import * as cheerio from "cheerio";

const ogCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to create fallback data for blocked DOI links
async function createDoiFallback(url: string, finalUrl?: string): Promise<any> {
  const doi = url.replace("https://doi.org/", "");

  // Extract publisher information from the final URL if available
  let publisher = "Academic Publisher";
  let siteName = "DOI";

  if (finalUrl) {
    try {
      const urlObj = new URL(finalUrl);
      const hostname = urlObj.hostname.toLowerCase();

      // Map common publisher domains to readable names
      if (hostname.includes("jamanetwork.com")) {
        publisher = "JAMA Network";
        siteName = "JAMA";
      } else if (hostname.includes("nature.com")) {
        publisher = "Nature";
        siteName = "Nature";
      } else if (hostname.includes("science.org")) {
        publisher = "Science";
        siteName = "Science";
      } else if (
        hostname.includes("elsevier.com") ||
        hostname.includes("linkinghub.elsevier.com")
      ) {
        publisher = "Elsevier";
        siteName = "Elsevier";
      } else if (
        hostname.includes("springer.com") ||
        hostname.includes("springerlink.com")
      ) {
        publisher = "Springer";
        siteName = "Springer";
      } else if (hostname.includes("wiley.com")) {
        publisher = "Wiley";
        siteName = "Wiley";
      } else if (hostname.includes("tandfonline.com")) {
        publisher = "Taylor & Francis";
        siteName = "T&F";
      } else if (
        hostname.includes("sage.com") ||
        hostname.includes("sagepub.com")
      ) {
        publisher = "SAGE";
        siteName = "SAGE";
      } else if (hostname.includes("cambridge.org")) {
        publisher = "Cambridge University Press";
        siteName = "Cambridge";
      } else if (
        hostname.includes("oxford.org") ||
        hostname.includes("oup.com")
      ) {
        publisher = "Oxford University Press";
        siteName = "OUP";
      } else {
        // Extract domain name as fallback
        const domainParts = hostname.split(".");
        if (domainParts.length >= 2) {
          const mainDomain = domainParts[domainParts.length - 2];
          publisher = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
          siteName = publisher;
        }
      }
    } catch (e) {
      // If URL parsing fails, use defaults
    }
  }

  return {
    title: `Paper on ${publisher}`,
    description: `Academic paper published by ${publisher} with DOI ${doi}`,
    image: "",
    url: url, // Keep original DOI URL to respect doi.org redirects
    siteName: siteName,
    type: "article",
    favicon: "/icons/doi.png", // Use local DOI icon
    originalUrl: url,
    finalUrl: finalUrl || url,
    isFallback: true,
    publisher: publisher,
  };
}

export async function ogData(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const url = request.query.get("url");
  if (!url) {
    return {
      status: 400,
      jsonBody: { error: "URL parameter is required" },
    };
  }
  try {
    new URL(url);
  } catch {
    return {
      status: 400,
      jsonBody: { error: "Invalid URL format" },
    };
  }
  const cacheKey = url.toLowerCase();
  const cachedData = ogCache.get(cacheKey);
  const now = Date.now();
  if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
    context.log(`Cache hit for ${url}`);
    return { jsonBody: cachedData.data };
  }
  context.log(`Cache miss for ${url}, fetching...`);

  // Check if this is a DOI link
  const isDoiLink = url.includes("doi.org");

  let response;
  try {
    // Use more browser-like headers to reduce 403 errors
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    };

    response = await fetch(url, {
      headers,
      redirect: "follow",
    });
  } catch (e) {
    context.log(`Network error fetching ${url}: ${e}`);
    // For DOI links, return fallback instead of error
    if (isDoiLink) {
      const fallbackData = await createDoiFallback(url, url); // Use original URL as fallback
      ogCache.set(cacheKey, { data: fallbackData, timestamp: now });
      return { jsonBody: fallbackData };
    }
    return {
      status: 500,
      jsonBody: { error: "Failed to fetch URL" },
    };
  }

  if (!response.ok) {
    context.log(`HTTP ${response.status} for ${url}: ${response.statusText}`);

    // For DOI links that return 403/blocked, return fallback instead of error
    if (
      isDoiLink &&
      (response.status === 403 ||
        response.status === 429 ||
        response.status === 451)
    ) {
      const finalUrl = response.url || url;
      const fallbackData = await createDoiFallback(url, finalUrl);
      ogCache.set(cacheKey, { data: fallbackData, timestamp: now });
      return { jsonBody: fallbackData };
    }

    return {
      status: response.status,
      jsonBody: { error: `Failed to fetch URL: ${response.statusText}` },
    };
  }

  const finalUrl = response.url || url;
  const html = await response.text();
  const $ = cheerio.load(html);

  const ogData = {
    title:
      $('meta[property="og:title"]').attr("content") || $("title").text() || "",
    description:
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "",
    image: $('meta[property="og:image"]').attr("content") || "",
    url: $('meta[property="og:url"]').attr("content") || finalUrl,
    siteName: $('meta[property="og:site_name"]').attr("content") || "",
    type: $('meta[property="og:type"]').attr("content") || "",
    favicon:
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      "/favicon.ico",
    originalUrl: url,
    finalUrl: finalUrl,
    isFallback: false,
  };

  // For DOI links, if we got no meaningful data, use fallback
  if (
    isDoiLink &&
    (!ogData.title || ogData.title === "Redirecting" || ogData.title.length < 5)
  ) {
    context.log(`No meaningful data for DOI ${url}, using fallback`);
    const fallbackData = await createDoiFallback(url);
    ogCache.set(cacheKey, { data: fallbackData, timestamp: now });
    return { jsonBody: fallbackData };
  }

  if (!ogData.image) {
    const firstImage = $("img").first().attr("src");
    if (firstImage) {
      try {
        ogData.image = new URL(firstImage, finalUrl).toString();
      } catch {
        ogData.image = firstImage;
      }
    }
  } else if (ogData.image && !ogData.image.startsWith("http")) {
    try {
      ogData.image = new URL(ogData.image, finalUrl).toString();
    } catch {}
  }
  if (ogData.favicon && !ogData.favicon.startsWith("http")) {
    try {
      ogData.favicon = new URL(ogData.favicon, finalUrl).toString();
    } catch {}
  }

  ogCache.set(cacheKey, { data: ogData, timestamp: now });
  return { jsonBody: ogData };
}

app.http("ogData", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: ogData,
});
