import { Box, Container, Typography } from "@mui/material";

export default function SavesPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom>
          Saved Studies
        </Typography>
        <Typography color="text.secondary">
          This feature is coming soon. You will be able to view and manage your
          saved studies here.
        </Typography>
      </Container>
    </Box>
  );
}
