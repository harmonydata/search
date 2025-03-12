module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
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
}; 