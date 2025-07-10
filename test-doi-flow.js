const fetch = require("node-fetch");

async function traceDoiFlow(url) {
  console.log(`\n=== Tracing DOI flow for: ${url} ===`);

  try {
    // First, let's see what happens with redirect: 'manual' to see the redirect chain
    console.log("\n1. Testing with redirect: manual to see redirect chain...");
    const manualResponse = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "manual",
    });

    console.log(`   Status: ${manualResponse.status}`);
    console.log(
      `   Location header: ${manualResponse.headers.get("location")}`
    );

    if (manualResponse.status === 301 || manualResponse.status === 302) {
      const redirectUrl = manualResponse.headers.get("location");
      console.log(`   → Redirects to: ${redirectUrl}`);

      // Now test the redirect destination
      console.log("\n2. Testing the redirect destination...");
      const redirectResponse = await fetch(redirectUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
      });

      console.log(`   Status: ${redirectResponse.status}`);
      console.log(`   Status text: ${redirectResponse.statusText}`);
      console.log(`   Final URL: ${redirectResponse.url}`);

      if (redirectResponse.ok) {
        const html = await redirectResponse.text();
        console.log(`   HTML length: ${html.length} characters`);

        // Quick check for title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          console.log(`   Title: "${titleMatch[1].trim()}"`);
        }
      }
    }

    // Now test with redirect: 'follow' (like the cloud function does)
    console.log("\n3. Testing with redirect: follow (like cloud function)...");
    const followResponse = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    console.log(`   Status: ${followResponse.status}`);
    console.log(`   Status text: ${followResponse.statusText}`);
    console.log(`   Final URL: ${followResponse.url}`);

    if (followResponse.ok) {
      const html = await followResponse.text();
      console.log(`   HTML length: ${html.length} characters`);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Test the specific DOI that was failing
const testUrl = "https://doi.org/10.1001/archpsyc.64.6.668";

console.log("Tracing DOI redirect flow...");
traceDoiFlow(testUrl);

// Test multiple DOI links to see the pattern
const testUrls = [
  "https://doi.org/10.1001/archpsyc.64.6.668", // JAMA Network
  "https://doi.org/10.1038/s41586-020-2649-2", // Nature
  "https://doi.org/10.1016/j.cell.2020.02.052", // Elsevier
  "https://doi.org/10.1126/science.abc6284", // Science
];

console.log("Testing multiple DOI links to see the pattern...\n");

async function runAllTests() {
  for (const url of testUrls) {
    await traceDoiFlow(url);
    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

runAllTests();
