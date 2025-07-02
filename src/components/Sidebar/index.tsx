"use client";

import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Home,
  Search,
  ArrowLeftRight,
  Download,
  BarChart2,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { text: "Search", icon: Search, href: "/" },
  { text: "Studies", icon: BookOpen, href: "/studies" },
  { text: "Explore", icon: BarChart2, href: "/explore" },
  { text: "Compare", icon: ArrowLeftRight, href: "/compare" },
  { text: "Saves", icon: Download, href: "/saves" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  if (isMobile) {
    // Top bar for mobile
    return (
      <Box
        component="nav"
        sx={{
          width: "100%",
          height: 64,
          position: "fixed",
          top: 0,
          left: 0,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "grey.200",
          zIndex: 1200,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
        }}
      >
        {/* Logo */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Link href="/explore">
            <Box
              component="img"
              src="/search/harmony.png"
              alt="Harmony Logo"
              sx={{ width: 40, height: 40, objectFit: "contain" }}
            />
          </Link>
        </Box>
        {/* Navigation Items */}
        <Box sx={{ display: "flex", gap: 2 }}>
          {navigationItems.map((item) => (
            <ListItemButton
              key={item.text}
              component={Link}
              href={item.href}
              selected={pathname === item.href}
              sx={{
                flexDirection: "column",
                minWidth: 48,
                color: pathname === item.href ? "primary.main" : "inherit",
                px: 1,
                py: 0.5,
                borderRadius: 2,
                bgcolor: pathname === item.href ? "action.selected" : "inherit",
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, color: "inherit", mb: 0.5 }}>
                <item.icon size={22} />
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: 11,
                  textAlign: "center",
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          ))}
        </Box>
      </Box>
    );
  }

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
