"use client";

import { Container, Box, Typography } from "@mui/material";
import DatasetDetail from "@/components/DatasetDetail";

interface DatasetPageClientProps {
  dataset: any; // We'll type this properly later
}

export default function DatasetPageClient({ dataset }: DatasetPageClientProps) {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Dataset Details
        </Typography>
        <DatasetDetail dataset={dataset} />
      </Box>
    </Container>
  );
}
