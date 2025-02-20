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
          <Box sx={{ display: "flex" }}>
            <Sidebar />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                ml: "72px", // Width of the sidebar
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
