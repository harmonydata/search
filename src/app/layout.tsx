import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Box } from "@mui/material";
import ThemeRegistry from "@/components/ThemeRegistry";
import { ToastContainer } from "react-toastify";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { SearchProvider } from "@/contexts/SearchContext";
import "react-toastify/dist/ReactToastify.css";
import "@/app/globals.css";

// Configure fonts with optimized loading like next-atlas
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Optimized weights
  style: ["normal"], // Remove italic to reduce downloads
  display: "swap", // Swap fonts for better performance
  preload: true, // Preload for critical text
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ],
});

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
      </head>
      <body className={inter.className}>
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
