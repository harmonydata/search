import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

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
  // Keep static export for build-time compilation
  output:
    process.env.NEXT_STATIC_EXPORT || isGitHubPagesDeployment
      ? "export"
      : undefined,
  basePath: isGitHubPagesDeployment ? "/search" : "",
  assetPrefix: isGitHubPagesDeployment ? "/search" : "",
  trailingSlash: false,
  reactStrictMode: true, // Enable like next-atlas

  // Enable compression for static files
  compress: true,

  // Enable font optimization and package imports optimization
  experimental: {
    optimizePackageImports: ["@mui/material", "@mui/icons-material"],
    // Enable tree shaking for better dead code elimination
    esmExternals: true,
  },

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
  // Webpack optimizations like next-atlas
  webpack: (config, { dev, isServer }) => {
    // Use more stable chunk names to reduce build-to-build changes
    if (!dev && !isServer) {
      config.output.chunkFilename = "static/js/[name].[contenthash:8].js";
      config.output.filename = "static/js/[name].[contenthash:8].js";
    }

    // Let Next.js handle bundle splitting automatically
    // Custom splitChunks was creating a massive vendor chunk that hurt performance

    // Remove console.log statements in production builds (client-side only)
    if (!dev && !isServer) {
      // Configure terser to remove console.log, console.debug, console.info
      if (config.optimization && config.optimization.minimizer) {
        config.optimization.minimizer.forEach((minimizer: any) => {
          if (minimizer.constructor.name === "TerserPlugin") {
            minimizer.options.terserOptions = {
              ...minimizer.options.terserOptions,
              compress: {
                ...minimizer.options.terserOptions?.compress,
                drop_console: true, // Remove all console.* calls
                drop_debugger: true, // Remove debugger statements
                // Additional optimizations
                pure_funcs: ["console.log", "console.info", "console.debug"],
                passes: 2, // Multiple passes for better optimization
              },
              mangle: {
                // Better variable name mangling
                keep_fnames: false,
              },
            };
          }
        });
      }
    }

    // Exclude discovery-split directory from build
    config.module.rules.push({
      test: /\.tsx?$/,
      exclude: /discovery-split/,
    });

    // Module resolution is handled by Next.js optimizePackageImports

    // Add performance hints for both dev and production
    config.performance = {
      hints: "warning",
      maxEntrypointSize: 500000, // 500KB warning threshold
      maxAssetSize: 500000, // 500KB per asset warning threshold
    };

    return config;
  },
};

// Export with bundle analyzer if ANALYZE env var is set
export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: true,
  analyzerMode: "static",
})(nextConfig);
