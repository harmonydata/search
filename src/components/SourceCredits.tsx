"use client";

import { Box, Link, Typography } from "@mui/material";
import { Fragment } from "react";
import {
  SOURCES,
  creditTextFor,
  findSourceIdForCatalogue,
  recordSourceIds,
} from "@/config/sourceAttribution";

// Links the licence name to the licence and turns bare URLs into links
function renderCredit(text: string, licenceName?: string, licenceUrl?: string) {
  const patterns = ["https?://[^\\s]+?(?=\\.?(?:\\s|$))"];
  if (licenceName && licenceUrl) {
    patterns.unshift(licenceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  }
  return text.split(new RegExp(`(${patterns.join("|")})`, "g")).map((part, index) => {
    const href =
      licenceName && licenceUrl && part === licenceName
        ? licenceUrl
        : /^https?:\/\//.test(part)
          ? part
          : undefined;
    return href ? (
      <Link key={index} href={href} target="_blank" rel="noopener noreferrer">
        {part}
      </Link>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    );
  });
}

// One credit line per source of the record (extra_data.source, else the
// sources of its catalogue cards), as each source's terms require. See
// config/sourceAttribution.
export default function SourceCredits({
  source,
  catalogs,
  publisher,
}: {
  source?: unknown;
  catalogs?: { name?: string; url?: string }[];
  publisher?: string;
}) {
  let ids = recordSourceIds(source);
  if (ids.length === 0) {
    ids = (catalogs ?? [])
      .map((catalog) => findSourceIdForCatalogue(catalog.name, catalog.url))
      .filter((id): id is string => id !== undefined);
  }
  ids = Array.from(new Set(ids));
  if (ids.length === 0) return null;

  return (
    <Box sx={{ mt: 1 }}>
      {ids.map((id) => {
        const attribution = SOURCES[id]?.attribution;
        return (
          <Typography
            key={id}
            variant="caption"
            component="p"
            color="text.secondary"
            sx={{ mb: 0.5 }}
          >
            {renderCredit(
              creditTextFor(id, { publisher }),
              attribution?.licence_name,
              attribution?.licence_url
            )}
          </Typography>
        );
      })}
    </Box>
  );
}
