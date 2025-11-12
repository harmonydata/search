"use client";

import { useEffect, useState } from "react";
import { Box, Typography, FormControlLabel, Switch } from "@mui/material";
import { fetchVersionInfo, VersionInfo } from "@/services/api";
import { useSearch } from "@/contexts/SearchContext";

export default function SearchVersionToggle() {
  const { searchSettings, updateSearchSettings } = useSearch();
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(true);

  useEffect(() => {
    const loadVersionInfo = async () => {
      try {
        const version = await fetchVersionInfo();
        setVersionInfo(version);
      } catch (error) {
        console.error("Failed to fetch version info:", error);
        setVersionInfo({ harmony_discovery_version: "Unknown" });
      } finally {
        setLoadingVersion(false);
      }
    };

    loadVersionInfo();
  }, []);

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateSearchSettings({ useSearch2: event.target.checked });
  };

  return (
    <Box sx={{ mb: 3 }}>
      <FormControlLabel
        control={
          <Switch
            checked={searchSettings.useSearch2}
            onChange={handleToggle}
            color="primary"
          />
        }
        label={
          <Box>
            <Typography variant="body2" fontWeight={500}>
              Search Version
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {searchSettings.useSearch2
                ? "Previous Version"
                : loadingVersion
                ? "Loading..."
                : versionInfo?.harmony_discovery_version || "Current Version"}
            </Typography>
          </Box>
        }
      />
    </Box>
  );
}
