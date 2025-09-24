// Get current domain for dynamic links
export const getCurrentDomain = () => {
  if (typeof window !== "undefined") {
    // Handle local development with different ports
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      // DiscoveryNext runs on port 3222, React app runs on port 3000
      return "http://localhost:3000";
    }
    return window.location.origin;
  }
  return "https://harmonydata.ac.uk"; // fallback for SSR
};

// Get the correct path for React app links
export const getReactAppPath = () => {
  if (typeof window !== "undefined") {
    // Handle local development - React app is on port 3000
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "/app/"; // localhost:3000/app/
    }
    // Production - React app is under /app
    return "/app/"; // harmonydata.ac.uk/app/
  }
  return "/app/"; // fallback for SSR
};

// Generate a link to a specific harmonization in the React app
export const getHarmonizationUrl = (harmonizationId: string) => {
  return `${getCurrentDomain()}${getReactAppPath()}#/model/${harmonizationId}`;
};
