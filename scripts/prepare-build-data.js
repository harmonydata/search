#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const API_BASE = "https://harmonydataweaviate.azureedge.net";
const TMP_DIR = path.join(__dirname, "..", "tmp");

// Ensure tmp directory exists
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

async function fetchAllUuids() {
  console.log("Fetching all UUIDs from /discover/dump...");

  const allUuids = [];
  let after = null;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore) {
    try {
      const url = after
        ? `${API_BASE}/discover/dump?after=${after}&num_results=500`
        : `${API_BASE}/discover/dump?num_results=500`;

      console.log(`Fetching page ${pageCount + 1}...`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const uuids = data.results || [];

      if (uuids.length === 0) {
        console.log("No more UUIDs found, stopping pagination");
        hasMore = false;
      } else {
        allUuids.push(...uuids);
        after = uuids[uuids.length - 1].uuid;
        pageCount++;
        console.log(
          `Fetched ${uuids.length} UUIDs (total: ${allUuids.length})`
        );
      }
    } catch (error) {
      console.error(`Error fetching UUIDs at page ${pageCount + 1}:`, error);
      hasMore = false;
    }
  }

  console.log(`\n📦 Total UUIDs fetched: ${allUuids.length}`);

  // Count by resource type
  const studyCount = allUuids.filter((u) => u.resource_type === "study").length;
  const datasetCount = allUuids.filter(
    (u) => u.resource_type === "dataset"
  ).length;
  const otherCount = allUuids.length - studyCount - datasetCount;

  console.log(`   - Studies: ${studyCount}`);
  console.log(`   - Datasets: ${datasetCount}`);
  if (otherCount > 0) {
    console.log(`   - Other: ${otherCount}`);
  }
  console.log();

  return allUuids;
}

async function batchLookupObjects(uuids, batchSize = 50) {
  console.log(`Batch looking up ${uuids.length} objects...`);

  const results = [];
  const errors = [];

  for (let i = 0; i < uuids.length; i += batchSize) {
    const batch = uuids.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(uuids.length / batchSize);

    console.log(
      `Processing batch ${batchNumber}/${totalBatches} (${batch.length} objects)...`
    );

    const batchPromises = batch.map(async (item) => {
      try {
        const response = await fetch(
          `${API_BASE}/discover/lookup?uuid=${item.uuid}`
        );
        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data,
            uuid: item.uuid,
            resource_type: item.resource_type,
          };
        } else {
          return {
            success: false,
            error: `HTTP ${response.status}`,
            uuid: item.uuid,
            resource_type: item.resource_type,
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          uuid: item.uuid,
          resource_type: item.resource_type,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push(result);
        console.warn(`Failed to lookup ${result.uuid}: ${result.error}`);
      }
    }

    // Small delay between batches to be nice to the API
    if (i + batchSize < uuids.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(
    `Batch lookup complete: ${results.length} successful, ${errors.length} failed`
  );
  return { results, errors };
}

function organizeData(objects) {
  console.log("Organizing data by type...");

  const studies = [];
  const datasets = [];
  const childDatasets = [];

  for (const obj of objects) {
    // Extract the actual data from the results array
    const actualObj = obj.results && obj.results[0] ? obj.results[0] : obj;

    if (actualObj.extra_data?.resource_type === "study") {
      studies.push({
        uuid: actualObj.extra_data?.uuid,
        slug: actualObj.extra_data?.slug,
        data: actualObj,
      });

      // Extract child datasets
      if (actualObj.child_datasets) {
        for (const child of actualObj.child_datasets) {
          childDatasets.push({
            uuid: child.extra_data?.uuid,
            slug: child.extra_data?.slug,
            parentStudyUuid: actualObj.extra_data?.uuid,
            data: child,
          });
        }
      }
    } else if (actualObj.extra_data?.resource_type === "dataset") {
      datasets.push({
        uuid: actualObj.extra_data?.uuid,
        slug: actualObj.extra_data?.slug,
        data: actualObj,
      });
    }
  }

  // Filter out items without slugs or UUIDs
  const validStudies = studies.filter((s) => s.slug && s.uuid);
  const validDatasets = datasets.filter((d) => d.slug && d.uuid);
  const validChildDatasets = childDatasets.filter((cd) => cd.slug && cd.uuid);

  console.log(`\n📊 Data organization complete:`);
  console.log(`   ✅ ${validStudies.length} studies`);
  console.log(`   ✅ ${validDatasets.length} datasets`);
  console.log(`   ✅ ${validChildDatasets.length} child datasets`);
  console.log(
    `   📦 Total items: ${
      validStudies.length + validDatasets.length + validChildDatasets.length
    }\n`
  );

  return {
    studies: validStudies,
    datasets: validDatasets,
    childDatasets: validChildDatasets,
  };
}

async function saveData(organizedData) {
  console.log("Saving data to local files...");

  const studiesFile = path.join(TMP_DIR, "studies.json");
  const datasetsFile = path.join(TMP_DIR, "datasets.json");
  const childDatasetsFile = path.join(TMP_DIR, "child-datasets.json");

  fs.writeFileSync(studiesFile, JSON.stringify(organizedData.studies, null, 2));
  fs.writeFileSync(
    datasetsFile,
    JSON.stringify(organizedData.datasets, null, 2)
  );
  fs.writeFileSync(
    childDatasetsFile,
    JSON.stringify(organizedData.childDatasets, null, 2)
  );

  console.log(`Saved to ${studiesFile}`);
  console.log(`Saved to ${datasetsFile}`);
  console.log(`Saved to ${childDatasetsFile}`);
}

async function main() {
  try {
    console.log("Starting pre-build data preparation...");

    // Step 1: Fetch all UUIDs
    const uuids = await fetchAllUuids();

    if (uuids.length === 0) {
      console.error("No UUIDs fetched, exiting");
      process.exit(1);
    }

    // Step 2: Batch lookup all objects
    const { results, errors } = await batchLookupObjects(uuids);

    if (results.length === 0) {
      console.error("No objects successfully looked up, exiting");
      process.exit(1);
    }

    // Step 3: Organize data by type
    const organizedData = organizeData(results);

    // Step 4: Save to local files
    await saveData(organizedData);

    console.log("\n✅ Pre-build data preparation complete!");
    console.log(`\n📊 Final Summary:`);
    console.log(`   - Total UUIDs from dump: ${uuids.length}`);
    console.log(`   - Successfully looked up: ${results.length}`);
    console.log(`   - Failed lookups: ${errors.length}`);
    console.log(`   - Studies saved: ${organizedData.studies.length}`);
    console.log(`   - Datasets saved: ${organizedData.datasets.length}`);
    console.log(
      `   - Child datasets saved: ${organizedData.childDatasets.length}`
    );
    console.log(
      `   - Total items saved: ${
        organizedData.studies.length +
        organizedData.datasets.length +
        organizedData.childDatasets.length
      }\n`
    );

    if (errors.length > 0) {
      console.log("Errors summary:");
      errors.forEach((error) => {
        console.log(`  ${error.resource_type} ${error.uuid}: ${error.error}`);
      });
    }
  } catch (error) {
    console.error("Pre-build data preparation failed:", error);
    process.exit(1);
  }
}

main();
