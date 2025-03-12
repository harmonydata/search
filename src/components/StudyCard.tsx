"use client";

import ResourceCard, { ResourceData } from "./ResourceCard";

interface StudyCardProps {
  study: ResourceData;
}

export default function StudyCard({ study }: StudyCardProps) {
  return <ResourceCard resource={study} />;
}
