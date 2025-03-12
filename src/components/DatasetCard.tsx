"use client";

import ResourceCard, { ResourceData } from "./ResourceCard";

interface DatasetCardProps {
  dataset: ResourceData;
}

export default function DatasetCard({ dataset }: DatasetCardProps) {
  return <ResourceCard resource={dataset} />;
}
