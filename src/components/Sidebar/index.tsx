"use client";

import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Home, Search, ArrowLeftRight, Download } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { text: "Home", icon: Home, href: "/" },
  { text: "Discover", icon: Search, href: "/discover" },
  { text: "Compare", icon: ArrowLeftRight, href: "/compare" },
  { text: "Saves", icon: Download, href: "/saves" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <Box
      component="nav"
      sx={{
        width: 72,
        borderRight: "1px solid",
        borderColor: "grey.200",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        bgcolor: "background.paper",
      }}
    >
      <List>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={Link}
                href={item.href}
                sx={{
                  minHeight: 48,
                  justifyContent: "center",
                  px: 2.5,
                  ...(isActive && {
                    bgcolor: "grey.50",
                    "&:hover": {
                      bgcolor: "grey.100",
                    },
                  }),
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 0,
                    justifyContent: "center",
                    color: isActive ? "primary.main" : "grey.600",
                  }}
                >
                  <Icon size={24} />
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    display: "none",
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
