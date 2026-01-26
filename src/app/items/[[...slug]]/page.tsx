import ItemsPageClient from "./ItemsPageClient";

// Required for static export - return a single fallback param to generate one HTML file
// All other routes will be handled client-side by reading from the URL
export async function generateStaticParams() {
  // Return a single fallback param to ensure at least one HTML file is generated
  // The client component will read the actual slug from the URL
  return [{ slug: [] }];
}

export default function ItemsPage() {
  return <ItemsPageClient />;
}
