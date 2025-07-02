import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Box } from "@mui/material";
import ThemeRegistry from "@/components/ThemeRegistry";
import { ToastContainer } from "react-toastify";
import Sidebar from "@/components/Sidebar";
import "react-toastify/dist/ReactToastify.css";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Academic Resource Discovery",
  description: "Discover academic resources and research data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeRegistry>
          <Box
            sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}
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
        </ThemeRegistry>
      </body>
    </html>
  );
}
