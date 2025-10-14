#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const TMP_DIR = path.join(__dirname, "..", "tmp");

function main() {
  const studiesFile = path.join(TMP_DIR, "studies.json");
  const datasetsFile = path.join(TMP_DIR, "datasets.json");
  const childDatasetsFile = path.join(TMP_DIR, "child-datasets.json");

  // Check if files exist
  if (!fs.existsSync(studiesFile)) {
    console.error("❌ studies.json not found. Run 'npm run prepare-data' first.");
    process.exit(1);
  }

  // Load cached data
  const studies = JSON.parse(fs.readFileSync(studiesFile, "utf8"));
  const datasets = JSON.parse(fs.readFileSync(datasetsFile, "utf8"));
  const childDatasets = JSON.parse(fs.readFileSync(childDatasetsFile, "utf8"));

  console.log("\n📊 Cached data summary:");
  console.log(`   ✅ ${studies.length} studies`);
  console.log(`   ✅ ${datasets.length} datasets`);
  console.log(`   ✅ ${childDatasets.length} child datasets`);
  console.log(`   📦 Total items: ${studies.length + datasets.length + childDatasets.length}\n`);

  // Check for specific slug if provided as argument
  const searchSlug = process.argv[2];
  if (searchSlug) {
    console.log(`🔍 Searching for slug: "${searchSlug}"\n`);
    
    const foundStudy = studies.find(s => s.slug === searchSlug);
    const foundDataset = datasets.find(d => d.slug === searchSlug);
    const foundChildDataset = childDatasets.find(cd => cd.slug === searchSlug);

    if (foundStudy) {
      console.log(`✅ Found in studies:`);
      console.log(`   UUID: ${foundStudy.uuid}`);
      console.log(`   Slug: ${foundStudy.slug}`);
      console.log(`   Name: ${foundStudy.data?.dataset_schema?.name || foundStudy.data?.extra_data?.name || "N/A"}`);
    } else if (foundDataset) {
      console.log(`✅ Found in datasets:`);
      console.log(`   UUID: ${foundDataset.uuid}`);
      console.log(`   Slug: ${foundDataset.slug}`);
      console.log(`   Name: ${foundDataset.data?.dataset_schema?.name || foundDataset.data?.extra_data?.name || "N/A"}`);
    } else if (foundChildDataset) {
      console.log(`✅ Found in child datasets:`);
      console.log(`   UUID: ${foundChildDataset.uuid}`);
      console.log(`   Slug: ${foundChildDataset.slug}`);
      console.log(`   Parent Study UUID: ${foundChildDataset.parentStudyUuid}`);
      console.log(`   Name: ${foundChildDataset.data?.dataset_schema?.name || foundChildDataset.data?.extra_data?.name || "N/A"}`);
    } else {
      console.log(`❌ Slug "${searchSlug}" not found in cached data.`);
      console.log(`\nThis could mean:`);
      console.log(`   1. The study/dataset doesn't exist in the API`);
      console.log(`   2. The cached data is stale (run 'npm run prepare-data' again)`);
      console.log(`   3. The study/dataset was filtered out (missing slug or UUID)`);
      
      // Try partial matches
      console.log(`\n🔎 Searching for partial matches...\n`);
      const partialStudies = studies.filter(s => s.slug?.includes(searchSlug));
      const partialDatasets = datasets.filter(d => d.slug?.includes(searchSlug));
      const partialChildDatasets = childDatasets.filter(cd => cd.slug?.includes(searchSlug));
      
      if (partialStudies.length > 0) {
        console.log(`Found ${partialStudies.length} partial matches in studies:`);
        partialStudies.slice(0, 5).forEach(s => {
          console.log(`   - ${s.slug}`);
        });
        if (partialStudies.length > 5) {
          console.log(`   ... and ${partialStudies.length - 5} more`);
        }
      }
      
      if (partialDatasets.length > 0) {
        console.log(`Found ${partialDatasets.length} partial matches in datasets:`);
        partialDatasets.slice(0, 5).forEach(d => {
          console.log(`   - ${d.slug}`);
        });
        if (partialDatasets.length > 5) {
          console.log(`   ... and ${partialDatasets.length - 5} more`);
        }
      }
      
      if (partialChildDatasets.length > 0) {
        console.log(`Found ${partialChildDatasets.length} partial matches in child datasets:`);
        partialChildDatasets.slice(0, 5).forEach(cd => {
          console.log(`   - ${cd.slug}`);
        });
        if (partialChildDatasets.length > 5) {
          console.log(`   ... and ${partialChildDatasets.length - 5} more`);
        }
      }
    }
    console.log();
  } else {
    // Show first 10 studies as example
    console.log("📋 First 10 study slugs:");
    studies.slice(0, 10).forEach(s => {
      console.log(`   - ${s.slug}`);
    });
    if (studies.length > 10) {
      console.log(`   ... and ${studies.length - 10} more`);
    }
    console.log("\n💡 Usage: node scripts/check-cached-studies.js <slug>");
    console.log("   Example: node scripts/check-cached-studies.js eating-disorders-genetics-initiative\n");
  }
}

main();

