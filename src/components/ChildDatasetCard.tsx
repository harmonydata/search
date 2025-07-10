import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Link as MuiLink,
} from "@mui/material";
import Link from "next/link";

interface ChildDatasetCardProps {
  dataset: any;
}

export default function ChildDatasetCard({ dataset }: ChildDatasetCardProps) {
  const title =
    dataset.dataset_schema?.name ||
    dataset.extra_data?.name ||
    "Untitled Dataset";
  const description =
    dataset.dataset_schema?.description ||
    dataset.extra_data?.description ||
    "";
  const url = dataset.dataset_schema?.url?.[0] || "#";
  const keywords =
    dataset.dataset_schema?.keywords || dataset.extra_data?.keywords || [];
  const size = dataset.dataset_schema?.size;
  const temporalCoverage = dataset.dataset_schema?.temporalCoverage;

  return (
    <Card
      elevation={1}
      sx={{
        minWidth: 280,
        maxWidth: 400,
        flex: "1 1 320px",
        display: "flex",
        flexDirection: "column",
        mb: 2,
      }}
    >
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <MuiLink
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{
            fontWeight: 600,
            fontSize: "1.1rem",
            mb: 1,
            color: "primary.main",
          }}
        >
          {title}
        </MuiLink>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {description.length > 120
              ? description.slice(0, 120) + "..."
              : description}
          </Typography>
        )}
        {keywords.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
            {keywords.slice(0, 6).map((kw: string, i: number) => (
              <Chip key={kw + i} label={kw} size="small" variant="outlined" />
            ))}
          </Box>
        )}
        <Box sx={{ display: "flex", gap: 2, mt: "auto" }}>
          {size && (
            <Typography variant="caption" color="text.secondary">
              Size: {size}
            </Typography>
          )}
          {temporalCoverage && (
            <Typography variant="caption" color="text.secondary">
              Years: {temporalCoverage}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
