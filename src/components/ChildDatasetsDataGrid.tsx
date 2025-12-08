"use client";
import { useMemo } from "react";
import {
  DataGrid,
  GridColDef,
  QuickFilter,
  QuickFilterControl,
} from "@mui/x-data-grid";
import { Box, Typography, Link as MuiLink } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ChildDatasetsDataGridProps {
  datasets: Array<any>;
}

export default function ChildDatasetsDataGrid({
  datasets,
}: ChildDatasetsDataGridProps) {
  const pathname = usePathname();
  const isSearchPage = pathname === "/discover";

  const columns: GridColDef[] = [
    {
      field: "title",
      headerName: "Dataset Name",
      flex: 1,
      minWidth: 300,
      renderCell: (params) => {
        const title = params.value || "Untitled Dataset";
        const slug = params.row.slug;
        const uuid = params.row.uuid;

        const href = slug ? `/items/${slug}` : uuid ? `/items/${uuid}` : null;

        if (href) {
          const linkProps = {
            href,
            underline: "hover" as const,
            sx: {
              fontWeight: 600,
              color: "primary.main",
            },
          };

          if (isSearchPage) {
            // Open in new tab on search page to preserve search state
            return (
              <MuiLink {...linkProps} target="_blank" rel="noopener noreferrer">
                {title}
              </MuiLink>
            );
          } else {
            return (
              <MuiLink component={Link} {...linkProps}>
                {title}
              </MuiLink>
            );
          }
        }

        return (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        );
      },
    },
    {
      field: "numVariables",
      headerName: "Variables",
      width: 120,
      renderCell: (params) => {
        const numVariables = params.value;
        return (
          <Typography variant="body2" color="text.secondary">
            {numVariables || "-"}
          </Typography>
        );
      },
    },
    {
      field: "temporalCoverage",
      headerName: "Time Coverage",
      width: 150,
      renderCell: (params) => {
        const coverage = params.value;
        return (
          <Typography variant="body2" color="text.secondary">
            {coverage || "-"}
          </Typography>
        );
      },
    },
  ];

  const rows = useMemo(() => {
    return datasets.map((dataset, index) => ({
      id: dataset.extra_data?.uuid || index,
      title:
        dataset.dataset_schema?.name ||
        dataset.extra_data?.name ||
        "Untitled Dataset",
      slug: dataset.extra_data?.slug,
      uuid: dataset.extra_data?.uuid,
      numVariables:
        dataset.dataset_schema?.number_of_variables ||
        dataset.extra_data?.num_variables ||
        dataset.extra_data?.number_of_variables,
      temporalCoverage: dataset.dataset_schema?.temporalCoverage,
    }));
  }, [datasets]);

  return (
    <Box sx={{ height: "100%", minHeight: 200 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        disableRowSelectionOnClick
        sortModel={[{ field: "title", sort: "asc" }]}
        sx={{
          background: "white",
          borderRadius: 2,
          fontSize: 14,
          height: "100%",
        }}
        hideFooter
        pageSizeOptions={[20, 50, 100]}
        showToolbar
        slots={{
          toolbar: () => (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 1,
                mr: 2,
              }}
            >
              <QuickFilter expanded={true} style={{ width: "100%" }}>
                <QuickFilterControl />
              </QuickFilter>
            </Box>
          ),
        }}
      />
    </Box>
  );
}
