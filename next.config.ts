import type { NextConfig } from "next";

// Only apply base path when explicitly building for GitHub Pages deployment
const isGitHubPagesDeployment = process.env.GITHUB_PAGES_DEPLOYMENT === "true";
console.log(
  `[next.config.js] DEBUG: process.env.GITHUB_PAGES_DEPLOYMENT = '${process.env.GITHUB_PAGES_DEPLOYMENT}'`
);
console.log(
  `[next.config.js] DEBUG: isGitHubPagesDeployment = ${isGitHubPagesDeployment}`
);
console.log(
  `[next.config.js] DEBUG: Calculated assetPrefix = '${
    isGitHubPagesDeployment ? "/search" : ""
  }'`
);

const nextConfig: NextConfig = {
  // Only enable static export when NEXT_STATIC_EXPORT is true OR when building for GitHub Pages
  output:
    process.env.NEXT_STATIC_EXPORT || isGitHubPagesDeployment
      ? "export"
      : undefined,
  basePath: isGitHubPagesDeployment ? "/search" : "",
  assetPrefix: isGitHubPagesDeployment ? "/search" : "",
  trailingSlash: false,
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add rewrites for development to handle /search prefix
  async rewrites() {
    if (isGitHubPagesDeployment) return [];
    return [
      {
        source: "/search/:path*",
        destination: "/:path*",
      },
    ];
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
  // Exclude discovery-split directory from build
  webpack: (config) => {
    config.module.rules.push({
      test: /\.tsx?$/,
      exclude: /discovery-split/,
    });
    return config;
  },
};

export default nextConfig;
