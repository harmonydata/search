"use client";

import ResourceCard, { ResourceData } from "./ResourceCard";

interface VariableCardProps {
  variable: ResourceData;
}

export default function VariableCard({ variable }: VariableCardProps) {
  return <ResourceCard resource={variable} />;
}
