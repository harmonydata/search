const fetch = require("node-fetch");
const cheerio = require("cheerio");

async function testOgFetch(
  url,
  userAgent = "Mozilla/5.0 (compatible; DiscoveryNext/1.0; +https://discoverynext.org)"
) {
  console.log(`Testing URL: ${url}`);
  console.log(`User-Agent: ${userAgent}`);

  try {
    // Test the fetch with different headers
    const response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response status text: ${response.statusText}`);
    console.log(`Final URL after redirects: ${response.url}`);

    if (!response.ok) {
      console.log(`Failed to fetch: ${response.status} ${response.statusText}`);
      return;
    }

    const html = await response.text();
    console.log(`HTML length: ${html.length} characters`);

    // Parse with cheerio like the cloud function does
    const $ = cheerio.load(html);

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
      url: $('meta[property="og:url"]').attr("content") || response.url,
      siteName: $('meta[property="og:site_name"]').attr("content") || "",
      type: $('meta[property="og:type"]').attr("content") || "",
      favicon:
        $('link[rel="icon"]').attr("href") ||
        $('link[rel="shortcut icon"]').attr("href") ||
        "/favicon.ico",
      originalUrl: url,
      finalUrl: response.url,
    };

    console.log("Extracted OG data:");
    console.log(JSON.stringify(ogData, null, 2));

    // Check if we got any meaningful data
    if (!ogData.title && !ogData.description) {
      console.log(
        "⚠️  No title or description found - this might be a 403 or blocked request"
      );

      // Try to see what we actually got
      const title = $("title").text();
      const firstMeta = $("meta").first().toString();
      console.log(`Page title: "${title}"`);
      console.log(`First meta tag: ${firstMeta}`);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }

  console.log("---\n");
}

// Test with different User-Agent strings
const userAgents = [
  "Mozilla/5.0 (compatible; DiscoveryNext/1.0; +https://discoverynext.org)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
];

const testUrl = "https://doi.org/10.1001/archpsyc.64.6.668";

async function runTests() {
  console.log("Testing different User-Agent strings for JAMA DOI...\n");

  for (const userAgent of userAgents) {
    await testOgFetch(testUrl, userAgent);
    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

runTests();
