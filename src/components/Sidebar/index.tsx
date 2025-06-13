"use client";

import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Home,
  Search,
  ArrowLeftRight,
  Download,
  BarChart2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { text: "Search", icon: Search, href: "/" },
  { text: "Explore", icon: BarChart2, href: "/explore" },
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
      {/* Logo */}
      <Box sx={{ p: 1, pt: 3, display: "flex", justifyContent: "center" }}>
        <Link href="/explore">
          <Box
            component="img"
            src="/search/harmony.png"
            alt="Harmony Logo"
            sx={{ width: 48, height: 48, objectFit: "contain" }}
          />
        </Link>
      </Box>

      {/* Navigation Items */}
      <List sx={{ mt: 2 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              href={item.href}
              selected={pathname === item.href}
              sx={{
                minHeight: 48,
                justifyContent: "center",
                px: 2.5,
                "&.Mui-selected": {
                  bgcolor: "action.selected",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: "auto",
                  justifyContent: "center",
                  color: pathname === item.href ? "primary.main" : "inherit",
                }}
              >
                <item.icon size={24} />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
