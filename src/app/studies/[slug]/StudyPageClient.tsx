"use client";

import { Container, Box } from "@mui/material";
import StudyDetail from "@/components/StudyDetail";
import { getAssetPrefix } from "@/lib/utils/shared";

interface StudyPageClientProps {
  study: any;
  studyDataComplete?: boolean;
}

export default function StudyPageClient({
  study,
  studyDataComplete = false,
}: StudyPageClientProps) {
  return (
    <Container
      maxWidth={false}
      sx={{
        py: 4,
        px: { xs: 2, sm: 3, md: 4 },
        width: "100%",
      }}
    >
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 2,
          overflow: "auto",
          width: "100%",
          minWidth: 0, // Allow shrinking below content size
        }}
      >
        <StudyDetail
          study={study}
          isDrawerView={false}
          studyDataComplete={studyDataComplete}
          onTopicClick={(topic) => {
            // Handle topic clicks - navigate to search with topic
            window.location.href = `${getAssetPrefix()}discover?topics=${encodeURIComponent(
              topic
            )}`;
          }}
          onInstrumentClick={(instrument) => {
            // Handle instrument clicks - navigate to search with instrument
            window.location.href = `${getAssetPrefix()}discover?instruments=${encodeURIComponent(
              instrument
            )}`;
          }}
        />
      </Box>
    </Container>
  );
}
