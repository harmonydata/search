const fetch = require("node-fetch");
const cheerio = require("cheerio");

async function testDoiMetadata(url) {
  console.log(`\n=== Testing DOI metadata for: ${url} ===`);

  try {
    // Test with redirect: manual to see what doi.org returns
    console.log("\n1. Testing doi.org response (before redirect)...");
    const manualResponse = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "manual",
    });

    console.log(`   Status: ${manualResponse.status}`);
    console.log(
      `   Content-Type: ${manualResponse.headers.get("content-type")}`
    );
    console.log(
      `   Location header: ${manualResponse.headers.get("location")}`
    );

    if (manualResponse.status === 302 || manualResponse.status === 301) {
      // doi.org returned a redirect - let's see if it has any HTML content
      const html = await manualResponse.text();
      console.log(`   HTML length: ${html.length} characters`);

      if (html.length > 0) {
        const $ = cheerio.load(html);

        // Check for Open Graph metadata
        const ogTitle = $('meta[property="og:title"]').attr("content");
        const ogDescription = $('meta[property="og:description"]').attr(
          "content"
        );
        const ogImage = $('meta[property="og:image"]').attr("content");
        const title = $("title").text();

        console.log(`   Title: "${title}"`);
        console.log(`   OG Title: "${ogTitle}"`);
        console.log(`   OG Description: "${ogDescription}"`);
        console.log(`   OG Image: "${ogImage}"`);

        // Check for any other useful metadata
        const description = $('meta[name="description"]').attr("content");
        console.log(`   Meta Description: "${description}"`);

        // Check for any DOI-specific information
        const doiInfo = $('meta[name="citation_doi"]').attr("content");
        console.log(`   Citation DOI: "${doiInfo}"`);
      }

      // Now let's see what the redirect URL tells us
      const redirectUrl = manualResponse.headers.get("location");
      console.log(`\n2. Analyzing redirect URL: ${redirectUrl}`);

      // Extract publisher info from redirect URL
      const urlObj = new URL(redirectUrl);
      console.log(`   Publisher domain: ${urlObj.hostname}`);
      console.log(`   Publisher path: ${urlObj.pathname}`);
      console.log(`   Query params: ${urlObj.search}`);

      // Try to extract DOI from the redirect URL
      const doiMatch = redirectUrl.match(/doi=([^&]+)/);
      if (doiMatch) {
        console.log(`   DOI from URL: ${doiMatch[1]}`);
      }
    }

    // Test with a different approach - try to get doi.org to return content
    console.log("\n3. Testing with Accept header to get HTML from doi.org...");
    const htmlResponse = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "manual",
    });

    console.log(`   Status: ${htmlResponse.status}`);
    console.log(`   Content-Type: ${htmlResponse.headers.get("content-type")}`);

    if (htmlResponse.status === 302 || htmlResponse.status === 301) {
      const html = await htmlResponse.text();
      console.log(`   HTML length: ${html.length} characters`);

      if (html.length > 0) {
        const $ = cheerio.load(html);
        const title = $("title").text();
        console.log(`   Title: "${title}"`);

        // Look for any DOI-specific content
        const bodyText = $("body").text();
        if (bodyText.length > 0) {
          console.log(
            `   Body text preview: "${bodyText.substring(0, 200)}..."`
          );
        }
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function testFaviconFetching(url) {
  console.log(`\n=== Testing favicon fetching for: ${url} ===`);

  try {
    // First get the redirect URL
    const manualResponse = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "manual",
    });

    if (manualResponse.status === 302 || manualResponse.status === 301) {
      const redirectUrl = manualResponse.headers.get("location");
      const urlObj = new URL(redirectUrl);
      const publisherDomain = urlObj.protocol + "//" + urlObj.hostname;

      console.log(`Publisher domain: ${publisherDomain}`);

      // Test common favicon paths
      const faviconPaths = [
        "/favicon.ico",
        "/favicon.png",
        "/apple-touch-icon.png",
        "/apple-touch-icon-precomposed.png",
        "/icon.png",
        "/logo.png",
      ];

      for (const path of faviconPaths) {
        const faviconUrl = publisherDomain + path;
        console.log(`\nTesting favicon: ${faviconUrl}`);

        try {
          const faviconResponse = await fetch(faviconUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });

          console.log(`  Status: ${faviconResponse.status}`);
          console.log(
            `  Content-Type: ${faviconResponse.headers.get("content-type")}`
          );
          console.log(
            `  Content-Length: ${faviconResponse.headers.get("content-length")}`
          );

          if (faviconResponse.ok) {
            console.log(`  ✅ Favicon found at: ${faviconUrl}`);
            break;
          }
        } catch (error) {
          console.log(`  ❌ Error: ${error.message}`);
        }
      }

      // Also try to get the favicon from the HTML head (even if main content is blocked)
      console.log(`\nTrying to get favicon from HTML head...`);
      try {
        const htmlResponse = await fetch(redirectUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        if (htmlResponse.status === 403) {
          console.log(
            `  Main content blocked (403), but let's try common favicon locations...`
          );

          // Try some publisher-specific favicon paths
          const publisherSpecificPaths = {
            "jamanetwork.com": [
              "/favicon.ico",
              "/static/images/favicon.ico",
              "/images/favicon.ico",
            ],
            "nature.com": [
              "/static/images/favicons/nature/favicon-48x48-b52890008c.png",
              "/favicon.ico",
            ],
            "science.org": ["/favicon.ico", "/static/favicon.ico"],
            "elsevier.com": ["/favicon.ico", "/static/favicon.ico"],
          };

          const hostname = urlObj.hostname.toLowerCase();
          const specificPaths = publisherSpecificPaths[hostname] || [];

          for (const path of specificPaths) {
            const faviconUrl = publisherDomain + path;
            console.log(`  Testing publisher-specific: ${faviconUrl}`);

            try {
              const faviconResponse = await fetch(faviconUrl, {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
              });

              if (faviconResponse.ok) {
                console.log(
                  `  ✅ Publisher-specific favicon found: ${faviconUrl}`
                );
                break;
              }
            } catch (error) {
              console.log(`  ❌ Error: ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.log(`  Error fetching HTML: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function test403Content(url) {
  console.log(`\n=== Testing 403 response content for: ${url} ===`);

  try {
    // Get the redirect URL first
    const manualResponse = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "manual",
    });

    if (manualResponse.status === 302 || manualResponse.status === 301) {
      const redirectUrl = manualResponse.headers.get("location");
      console.log(`Redirect URL: ${redirectUrl}`);

      // Now try to fetch the redirect destination to see the 403 content
      const blockedResponse = await fetch(redirectUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      console.log(`Status: ${blockedResponse.status}`);
      console.log(
        `Content-Type: ${blockedResponse.headers.get("content-type")}`
      );
      console.log(
        `Content-Length: ${blockedResponse.headers.get("content-length")}`
      );

      if (blockedResponse.status === 403) {
        const html = await blockedResponse.text();
        console.log(`\n403 Response HTML (first 500 chars):`);
        console.log(html.substring(0, 500));

        // Parse with cheerio to see if there's any metadata
        const $ = cheerio.load(html);

        console.log(`\nMetadata analysis:`);
        console.log(`Title: "${$("title").text()}"`);
        console.log(
          `Meta description: "${$('meta[name="description"]').attr("content")}"`
        );
        console.log(
          `OG title: "${$('meta[property="og:title"]').attr("content")}"`
        );
        console.log(
          `OG description: "${$('meta[property="og:description"]').attr(
            "content"
          )}"`
        );
        console.log(`Favicon: "${$('link[rel="icon"]').attr("href")}"`);
        console.log(
          `Apple touch icon: "${$('link[rel="apple-touch-icon"]').attr(
            "href"
          )}"`
        );

        // Check if there are any links at all
        const links = $("link").length;
        const metas = $("meta").length;
        console.log(`\nTotal <link> tags: ${links}`);
        console.log(`Total <meta> tags: ${metas}`);

        if (links > 0) {
          console.log(`\nAll <link> tags:`);
          $("link").each((i, el) => {
            const rel = $(el).attr("rel");
            const href = $(el).attr("href");
            console.log(`  ${rel}: ${href}`);
          });
        }
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Test with the DOI that was failing
const testUrl = "https://doi.org/10.1001/archpsyc.64.6.668";

console.log("Testing DOI metadata extraction...");
testDoiMetadata(testUrl);

// Test favicon fetching for the DOI
console.log("Testing favicon fetching from publisher domains...");
testFaviconFetching(testUrl);

// Test multiple publishers for favicon access
const testUrls = [
  "https://doi.org/10.1001/archpsyc.64.6.668", // JAMA Network
  "https://doi.org/10.1038/s41586-020-2649-2", // Nature
  "https://doi.org/10.1016/j.cell.2020.02.052", // Elsevier
  "https://doi.org/10.1126/science.abc6284", // Science
];

console.log("Testing multiple publishers for favicon access...\n");

async function runAllFaviconTests() {
  for (const url of testUrls) {
    await testFaviconFetching(url);
    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

runAllFaviconTests();

// Test 403 content for the JAMA DOI
console.log("\n\nTesting 403 response content...");
test403Content("https://doi.org/10.1001/archpsyc.64.6.668");
