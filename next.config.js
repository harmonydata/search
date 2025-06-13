// Only apply base path when explicitly building for GitHub Pages deployment
const isGitHubPagesDeployment = process.env.GITHUB_PAGES_DEPLOYMENT === "true";

module.exports = {
  // Only enable static export when NEXT_STATIC_EXPORT is true OR when building for GitHub Pages
  output:
    process.env.NEXT_STATIC_EXPORT || isGitHubPagesDeployment
      ? "export"
      : undefined,
  basePath: isGitHubPagesDeployment ? "/search" : "",
  assetPrefix: isGitHubPagesDeployment ? "/search" : "",
  trailingSlash: isGitHubPagesDeployment,
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Exclude API routes and Azure Functions during static export or serving
  webpack: (config) => {
    if (process.env.NEXT_STATIC_EXPORT || isGitHubPagesDeployment) {
      // Exclude Azure Functions and API routes from the build
      config.module.rules.push({
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: [/azure-functions/, /api/],
      });
    }
    return config;
  },
  images: {
    unoptimized:
      process.env.NEXT_STATIC_EXPORT || isGitHubPagesDeployment ? true : false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.ac.uk",
      },
      {
        protocol: "http",
        hostname: "**.ac.uk",
      },
      {
        protocol: "https",
        hostname: "**.edu",
      },
      {
        protocol: "https",
        hostname: "**.org",
      },
      {
        protocol: "https",
        hostname: "**.gov",
      },
      {
        protocol: "https",
        hostname: "**.org.uk",
      },
      {
        protocol: "https",
        hostname: "**.nhs.uk",
      },
      {
        protocol: "https",
        hostname: "cataloguementalhealth.ac.uk",
      },
      {
        protocol: "https",
        hostname: "www.cataloguementalhealth.ac.uk",
      },
    ],
    // Allow data URLs for client-side rendering fallbacks
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Skip server-side routes during static export
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
};
