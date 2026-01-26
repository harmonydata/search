"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DatasetPageClient from "@/components/DatasetPageClient";

export default function ItemsPageClient() {
  const pathname = usePathname();
  const [identifier, setIdentifier] = useState<string | null>(null);

  useEffect(() => {
    // Extract identifier (slug or UUID) from pathname: /items/identifier or /search/items/identifier
    if (pathname) {
      // Remove /items/ or /search/items/ prefix
      const match = pathname.match(/\/(?:search\/)?items\/(.+)$/);
      if (match && match[1]) {
        setIdentifier(match[1]);
      } else if (pathname === "/items" || pathname === "/search/items") {
        // No identifier provided
        setIdentifier(null);
      }
    }
  }, [pathname]);

  // If no identifier, show error
  if (!identifier) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Item Not Found</h1>
        <p>Please provide a valid item slug or UUID in the URL.</p>
      </div>
    );
  }

  // Render the client component - fetchResultByUuid handles both slugs and UUIDs
  return <DatasetPageClient slug={identifier} initialData={null} />;
}
