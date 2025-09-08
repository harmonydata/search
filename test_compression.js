const https = require("https");
const fs = require("fs");
const zlib = require("zlib");

const url =
  "https://harmonydataweaviate.azureedge.net/discover/lookup?uuid=0f98a49d0e80872a80f5412f024bc57f";

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

function compressWithBrotli(data) {
  return zlib.brotliCompressSync(data);
}

function analyzeAndSave(jsonString) {
  try {
    // Parse the JSON
    const data = JSON.parse(jsonString);
    console.log("JSON parsed successfully");

    // Save original to file
    fs.writeFileSync("ncds_response.json", jsonString);
    console.log("NCDS response saved to ncds_response.json");
    console.log("Original size:", jsonString.length, "bytes");
    
    // Compress with different methods
    const gzipped = compressWithGzip(jsonString);
    const brotli = compressWithBrotli(jsonString);
    
    console.log("\n=== COMPRESSION ANALYSIS ===");
    console.log("GZIP compressed size:", gzipped.length, "bytes");
    console.log(
      "GZIP compression ratio:",
      ((1 - gzipped.length / jsonString.length) * 100).toFixed(2) + "%"
    );
    console.log("Brotli compressed size:", brotli.length, "bytes");
    console.log(
      "Brotli compression ratio:",
      ((1 - brotli.length / jsonString.length) * 100).toFixed(2) + "%"
    );
    
    // Check if it has variables_which_matched
    if (
      data.results &&
      data.results[0] &&
      data.results[0].variables_which_matched
    ) {
      console.log(
        "Has variables_which_matched with",
        data.results[0].variables_which_matched.length,
        "items"
      );
    } else {
      console.log("No variables_which_matched found");
    }
    
    // Check variableMeasured arrays
    let totalVariables = 0;
    let totalUrls = 0;
    
    if (data.results) {
      data.results.forEach((result, index) => {
        if (result.dataset_schema && result.dataset_schema.variableMeasured) {
          const variableMeasured = result.dataset_schema.variableMeasured;
          console.log(
            `Dataset ${index + 1}: ${result.dataset_schema.name} has ${
              variableMeasured.length
            } variables`
          );
          totalVariables += variableMeasured.length;
          
          variableMeasured.forEach((variable) => {
            if (variable.url) {
              totalUrls++;
            }
          });
        }
      });
    }
    
    console.log(`Total variables across all datasets: ${totalVariables}`);
    console.log(`Total URL properties: ${totalUrls}`);
    
  } catch (error) {
    console.error("Error processing JSON:", error.message);
  }
}

async function main() {
  try {
    console.log("Fetching NCDS JSON response (no query filter)...");
    const jsonString = await fetchWithCompression();

    console.log("\nAnalyzing and saving...");
    analyzeAndSave(jsonString);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
