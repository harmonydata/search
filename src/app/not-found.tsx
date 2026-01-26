"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DatasetPageClient from "@/components/DatasetPageClient";
import { Box, Typography } from "@mui/material";

export default function NotFound() {
  const pathname = usePathname();
  const [isItemsRoute, setIsItemsRoute] = useState(false);
  const [identifier, setIdentifier] = useState<string | null>(null);

  useEffect(() => {
    // Check if this is an /items/* route
    if (pathname) {
      const match = pathname.match(/\/(?:search\/)?items\/(.+)$/);
      if (match && match[1]) {
        setIsItemsRoute(true);
        setIdentifier(match[1]);
      }
    }
  }, [pathname]);

  // If it's an /items/* route, render the items page client-side
  if (isItemsRoute && identifier) {
    return <DatasetPageClient slug={identifier} initialData={null} />;
  }

  // Otherwise, show the standard 404 page
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="400px"
      gap={2}
      sx={{ p: 4 }}
    >
      <Typography variant="h4">404 - Page Not Found</Typography>
      <Typography variant="body1" color="text.secondary">
        The page you are looking for does not exist.
      </Typography>
    </Box>
  );
}
