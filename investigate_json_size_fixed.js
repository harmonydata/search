const https = require("https");
const fs = require("fs");
const zlib = require("zlib");

const url =
  "https://harmonydataweaviate.azureedge.net/discover/lookup?uuid=1bcff6f4d91dc98f895f10c377fb1b8d";

async function fetchWithCompression() {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent": "Mozilla/5.0 (compatible; investigation-script)",
      },
    };

    const request = https.get(url, options, (response) => {
      console.log("Response status:", response.statusCode);
      console.log("Content-Encoding:", response.headers["content-encoding"]);
      console.log("Content-Length:", response.headers["content-length"]);
      console.log("Transfer-Encoding:", response.headers["transfer-encoding"]);

      let data = [];
      let stream = response;

      // Handle compression
      if (response.headers["content-encoding"] === "gzip") {
        stream = response.pipe(zlib.createGunzip());
        console.log("Decompressing gzip...");
      } else if (response.headers["content-encoding"] === "br") {
        stream = response.pipe(zlib.createBrotliDecompress());
        console.log("Decompressing brotli...");
      } else if (response.headers["content-encoding"] === "deflate") {
        stream = response.pipe(zlib.createInflate());
        console.log("Decompressing deflate...");
      }

      stream.on("data", (chunk) => {
        data.push(chunk);
      });

      stream.on("end", () => {
        const buffer = Buffer.concat(data);
        console.log("Raw response size:", buffer.length, "bytes");
        resolve(buffer.toString("utf8"));
      });

      stream.on("error", (err) => {
        reject(err);
      });
    });

    request.on("error", (err) => {
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

function compressWithGzip(data) {
  return zlib.gzipSync(data);
}

function analyzeAndSave(jsonString) {
  try {
    // Parse the JSON
    const data = JSON.parse(jsonString);
    console.log("JSON parsed successfully");

    // Save original to file
    fs.writeFileSync("original_response.json", jsonString);
    console.log("Original response saved to original_response.json");
    console.log("Original size:", jsonString.length, "bytes");

    // Compress original
    const originalGzipped = compressWithGzip(jsonString);
    console.log(
      "Original GZIP compressed size:",
      originalGzipped.length,
      "bytes"
    );
    console.log(
      "GZIP compression ratio:",
      ((1 - originalGzipped.length / jsonString.length) * 100).toFixed(2) + "%"
    );

    // Find and remove variables_which_matched from all results
    const withoutVariablesMatched = JSON.parse(jsonString);
    let variablesMatchedCount = 0;

    if (withoutVariablesMatched.results) {
      withoutVariablesMatched.results.forEach((result) => {
        if (result.variables_which_matched) {
          variablesMatchedCount++;
          delete result.variables_which_matched;
        }
      });
    }

    console.log(
      "Found and removed variables_which_matched from",
      variablesMatchedCount,
      "results"
    );

    // Use compact JSON (no pretty printing) for accurate size comparison
    const withoutVariablesMatchedString = JSON.stringify(
      withoutVariablesMatched
    );
    fs.writeFileSync(
      "without_variables_matched.json",
      withoutVariablesMatchedString
    );
    console.log(
      "Without variables_which_matched saved to without_variables_matched.json"
    );
    console.log(
      "Size without variables_which_matched:",
      withoutVariablesMatchedString.length,
      "bytes"
    );
    console.log(
      "Size reduction:",
      jsonString.length - withoutVariablesMatchedString.length,
      "bytes"
    );

    // Compress without variables_which_matched
    const withoutVariablesMatchedGzipped = compressWithGzip(
      withoutVariablesMatchedString
    );
    console.log(
      "Without variables_which_matched GZIP compressed size:",
      withoutVariablesMatchedGzipped.length,
      "bytes"
    );
    console.log(
      "GZIP compression ratio:",
      (
        (1 -
          withoutVariablesMatchedGzipped.length /
            withoutVariablesMatchedString.length) *
        100
      ).toFixed(2) + "%"
    );

    // Remove url properties from variableMeasured array
    const withoutUrls = JSON.parse(jsonString);
    let totalUrlCount = 0;

    if (withoutUrls.results) {
      withoutUrls.results.forEach((result) => {
        if (result.dataset_schema && result.dataset_schema.variableMeasured) {
          const variableMeasured = result.dataset_schema.variableMeasured;
          console.log(
            "Dataset",
            result.dataset_schema.name,
            "has",
            variableMeasured.length,
            "variables"
          );

          variableMeasured.forEach((variable) => {
            if (variable.url) {
              delete variable.url;
              totalUrlCount++;
            }
          });
        }
      });
    }

    console.log("Total URL properties removed:", totalUrlCount);

    // Use compact JSON (no pretty printing) for accurate size comparison
    const withoutUrlsString = JSON.stringify(withoutUrls);
    fs.writeFileSync("without_urls.json", withoutUrlsString);
    console.log("Without url properties saved to without_urls.json");
    console.log("Size without urls:", withoutUrlsString.length, "bytes");
    console.log(
      "Size reduction from original:",
      jsonString.length - withoutUrlsString.length,
      "bytes"
    );

    // Compress without URLs
    const withoutUrlsGzipped = compressWithGzip(withoutUrlsString);
    console.log(
      "Without URLs GZIP compressed size:",
      withoutUrlsGzipped.length,
      "bytes"
    );
    console.log(
      "GZIP compression ratio:",
      (
        (1 - withoutUrlsGzipped.length / withoutUrlsString.length) *
        100
      ).toFixed(2) + "%"
    );

    // Summary
    console.log("\n=== SIZE ANALYSIS SUMMARY ===");
    console.log("Original size:", jsonString.length, "bytes");
    console.log("Original GZIP compressed:", originalGzipped.length, "bytes");
    console.log(
      "Without variables_which_matched:",
      withoutVariablesMatchedString.length,
      "bytes"
    );
    console.log(
      "Without variables_which_matched GZIP compressed:",
      withoutVariablesMatchedGzipped.length,
      "bytes"
    );
    console.log("Without url properties:", withoutUrlsString.length, "bytes");
    console.log(
      "Without url properties GZIP compressed:",
      withoutUrlsGzipped.length,
      "bytes"
    );

    console.log("\n=== COMPRESSION ANALYSIS ===");
    console.log(
      "Original GZIP savings:",
      (jsonString.length - originalGzipped.length).toLocaleString(),
      "bytes"
    );
    console.log(
      "Without variables_which_matched GZIP savings:",
      (
        withoutVariablesMatchedString.length -
        withoutVariablesMatchedGzipped.length
      ).toLocaleString(),
      "bytes"
    );
    console.log(
      "Without URLs GZIP savings:",
      (withoutUrlsString.length - withoutUrlsGzipped.length).toLocaleString(),
      "bytes"
    );

    console.log("\n=== NETWORK TRANSFER COMPARISON ===");
    console.log(
      "Original vs Without variables_which_matched GZIP difference:",
      (
        originalGzipped.length - withoutVariablesMatchedGzipped.length
      ).toLocaleString(),
      "bytes"
    );
    console.log(
      "Original vs Without URLs GZIP difference:",
      (originalGzipped.length - withoutUrlsGzipped.length).toLocaleString(),
      "bytes"
    );
    console.log(
      "Percentage reduction (GZIP):",
      (
        ((originalGzipped.length - withoutUrlsGzipped.length) /
          originalGzipped.length) *
        100
      ).toFixed(2) + "%"
    );
  } catch (error) {
    console.error("Error processing JSON:", error.message);
  }
}

async function main() {
  try {
    console.log("Fetching JSON response...");
    const jsonString = await fetchWithCompression();

    console.log("\nAnalyzing and saving...");
    analyzeAndSave(jsonString);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
