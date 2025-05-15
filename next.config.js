module.exports = {
  // Only enable static export when NEXT_STATIC_EXPORT is true
  output: process.env.NEXT_STATIC_EXPORT ? 'export' : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: process.env.NEXT_STATIC_EXPORT ? true : false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.ac.uk',
      },
      {
        protocol: 'http',
        hostname: '**.ac.uk',
      },
      {
        protocol: 'https',
        hostname: '**.edu',
      },
      {
        protocol: 'https',
        hostname: '**.org',
      },
      {
        protocol: 'https',
        hostname: '**.gov',
      },
      {
        protocol: 'https',
        hostname: '**.org.uk',
      },
      {
        protocol: 'https',
        hostname: '**.nhs.uk',
      },
      {
        protocol: 'https',
        hostname: 'cataloguementalhealth.ac.uk',
      },
      {
        protocol: 'https',
        hostname: 'www.cataloguementalhealth.ac.uk',
      }
    ],
    // Allow data URLs for client-side rendering fallbacks
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Skip server-side routes during static export
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
}; 