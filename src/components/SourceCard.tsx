"use client";

import ResourceCard, { ResourceData } from "./ResourceCard";

interface SourceCardProps {
  source: ResourceData;
}

export default function SourceCard({ source }: SourceCardProps) {
  return <ResourceCard resource={source} />;
}
