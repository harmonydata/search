import type { Metadata } from "next";
// Removed Inter font - using Roboto from MUI theme instead
import { Box } from "@mui/material";
import ThemeRegistry from "@/components/ThemeRegistry";
import { ToastContainer } from "react-toastify";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { SearchProvider } from "@/contexts/SearchContext";
import "react-toastify/dist/ReactToastify.css";
import "@/app/globals.css";

// Fonts are handled by MUI theme (Roboto) for consistency

export const metadata: Metadata = {
  metadataBase: new URL("https://harmonydata.ac.uk/search/"),
  title: "Academic Resource Discovery",
  description: "Discover academic resources and research data",
  openGraph: {
    title: "Academic Resource Discovery",
    description: "Discover academic resources and research data",
    url: "https://harmonydata.ac.uk/search/",
    siteName: "Academic Resource Discovery",
    images: [
      {
        url: "/harmony.png",
        width: 1200,
        height: 630,
        alt: "Academic Resource Discovery",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Academic Resource Discovery",
    description: "Discover academic resources and research data",
    images: ["/harmony.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="emotion-insertion-point" content="" />
        {/* Preconnect hints for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://www.cataloguementalhealth.ac.uk" />
        <link rel="dns-prefetch" href="https://harmonydata.ac.uk" />
        {/* Critical CSS for immediate rendering with Roboto */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            /* Ensure immediate rendering with Roboto and fallbacks */
            * { 
              font-family: "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif !important;
              font-display: swap;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            body { 
              visibility: visible !important; 
              opacity: 1 !important; 
              margin: 0; 
              padding: 0; 
            }
          `,
          }}
        />
      </head>
      <body>
        <ThemeRegistry>
          <AuthProvider>
            <SearchProvider>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                }}
              >
                <Sidebar />
                <Box
                  component="main"
                  sx={{
                    flexGrow: 1,
                    // Responsive spacing for sidebar
                    ml: { xs: 0, md: "72px" }, // No left margin on mobile, 72px on desktop
                    mt: { xs: "64px", md: 0 }, // 64px top margin on mobile, none on desktop
                    minHeight: { xs: "calc(100vh - 64px)", md: "100vh" }, // Account for top bar height
                    width: { xs: "100%", md: "calc(100% - 72px)" }, // Full width on mobile, minus sidebar on desktop
                  }}
                >
                  {children}
                </Box>
              </Box>
              <ToastContainer position="bottom-right" />
            </SearchProvider>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
