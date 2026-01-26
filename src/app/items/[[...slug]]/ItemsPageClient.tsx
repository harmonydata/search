"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DatasetPageClient from "@/components/DatasetPageClient";

export default function ItemsPageClient() {
  const pathname = usePathname();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    // Extract slug from pathname: /items/slug or /search/items/slug
    if (pathname) {
      // Remove /items/ or /search/items/ prefix
      const slugMatch = pathname.match(/\/(?:search\/)?items\/(.+)$/);
      if (slugMatch && slugMatch[1]) {
        setSlug(slugMatch[1]);
      } else if (pathname === "/items" || pathname === "/search/items") {
        // No slug provided
        setSlug(null);
      }
    }
  }, [pathname]);

  // If no slug, show error
  if (!slug) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Item Not Found</h1>
        <p>Please provide a valid item slug in the URL.</p>
      </div>
    );
  }

  // Render the client component with the slug
  return <DatasetPageClient slug={slug} initialData={null} />;
}
