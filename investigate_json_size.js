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

function analyzeAndSave(jsonString) {
  try {
    // Parse the JSON
    const data = JSON.parse(jsonString);
    console.log("JSON parsed successfully");

    // Save original to file
    fs.writeFileSync("original_response.json", jsonString);
    console.log("Original response saved to original_response.json");
    console.log("Original size:", jsonString.length, "bytes");

    // Remove variables_which_matched array
    const withoutVariablesMatched = JSON.parse(jsonString);
    if (withoutVariablesMatched.results && withoutVariablesMatched.results[0]) {
      delete withoutVariablesMatched.results[0].variables_which_matched;
    }

    const withoutVariablesMatchedString = JSON.stringify(
      withoutVariablesMatched,
      null,
      2
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

    // Remove url properties from variableMeasured array
    const withoutUrls = JSON.parse(jsonString);
    if (
      withoutUrls.results &&
      withoutUrls.results[0] &&
      withoutUrls.results[0].dataset_schema &&
      withoutUrls.results[0].dataset_schema.variableMeasured
    ) {
      const variableMeasured =
        withoutUrls.results[0].dataset_schema.variableMeasured;
      console.log(
        "Number of variables in variableMeasured:",
        variableMeasured.length
      );

      variableMeasured.forEach((variable) => {
        if (variable.url) {
          delete variable.url;
        }
      });
    }

    const withoutUrlsString = JSON.stringify(withoutUrls, null, 2);
    fs.writeFileSync("without_urls.json", withoutUrlsString);
    console.log("Without url properties saved to without_urls.json");
    console.log("Size without urls:", withoutUrlsString.length, "bytes");
    console.log(
      "Size reduction from original:",
      jsonString.length - withoutUrlsString.length,
      "bytes"
    );

    // Summary
    console.log("\n=== SIZE ANALYSIS SUMMARY ===");
    console.log("Original size:", jsonString.length, "bytes");
    console.log(
      "Without variables_which_matched:",
      withoutVariablesMatchedString.length,
      "bytes"
    );
    console.log("Without url properties:", withoutUrlsString.length, "bytes");
    console.log(
      "Total reduction:",
      jsonString.length - withoutUrlsString.length,
      "bytes"
    );
    console.log(
      "Percentage reduction:",
      (
        ((jsonString.length - withoutUrlsString.length) / jsonString.length) *
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
