// Centralized loader for harmony-export web component
// Ensures the script is only loaded once and the custom element is registered once

let isLoading = false;
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

export const loadHarmonyExportComponent = async (): Promise<void> => {
  // If already loaded, return immediately
  if (isLoaded) {
    return;
  }

  // If currently loading, return the existing promise
  if (loadPromise) {
    return loadPromise;
  }

  // Start loading
  isLoading = true;
  loadPromise = new Promise<void>((resolve, reject) => {
    // Check if already registered (defensive check)
    if (customElements.get("harmony-export")) {
      console.log("🔍 Harmony export component already registered");
      isLoaded = true;
      isLoading = false;
      loadPromise = null;
      resolve();
      return;
    }

    console.log("🔍 Loading harmony-export web component");

    const script = document.createElement("script");
    script.src = "/app/js/harmony-export.js";
    script.async = true;

    script.onload = () => {
      console.log("✅ Harmony export component loaded successfully");
      isLoaded = true;
      isLoading = false;
      loadPromise = null;
      resolve();
    };

    script.onerror = (error) => {
      console.error("❌ Failed to load harmony-export component:", error);
      isLoading = false;
      loadPromise = null;
      reject(error);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

export const isHarmonyExportReady = (): boolean => {
  return isLoaded && !!customElements.get("harmony-export");
};
