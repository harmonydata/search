"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Typography, Box } from "@mui/material";

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("Error boundary caught an error:", error);
  }, [error]);

  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h4" gutterBottom>
        Oops! Something went wrong.
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {error.message}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={reset}
        sx={{ mr: 2 }}
      >
        Try again
      </Button>
      <Button variant="outlined" onClick={() => router.push("/")}>
        Go Home
      </Button>
    </Box>
  );
}
