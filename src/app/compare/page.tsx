import { Box, Container, Typography } from "@mui/material";

export default function ComparePage() {
  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom>
          Compare Studies
        </Typography>
        <Typography color="text.secondary">
          This feature is coming soon. You will be able to compare different
          studies and their variables.
        </Typography>
      </Container>
    </Box>
  );
}
