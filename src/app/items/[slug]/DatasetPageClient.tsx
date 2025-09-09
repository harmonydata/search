"use client";

import StudyDetail from "@/components/StudyDetail";

interface DatasetPageClientProps {
  dataset: any; // We'll type this properly later
}

export default function DatasetPageClient({ dataset }: DatasetPageClientProps) {
  return <StudyDetail study={dataset} />;
}
