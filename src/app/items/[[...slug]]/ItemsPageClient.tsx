"use client";

import DatasetPageClient from "@/components/DatasetPageClient";
import { SearchResult } from "@/services/api";

interface ItemsPageClientProps {
  identifier: string;
  initialData: SearchResult | null;
}

export default function ItemsPageClient({
  identifier,
  initialData,
}: ItemsPageClientProps) {
  // Render the client component - fetchResultByUuid handles both slugs and UUIDs
  // If initialData is provided (from build-time), use it; otherwise client will fetch
  return <DatasetPageClient slug={identifier} initialData={initialData} />;
}
