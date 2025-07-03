"use client";

import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Typography,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid } from "lucide-react";
import { getAssetPrefix } from "@/lib/utils/shared";
import { usePathname } from "next/navigation";

const navigationItems = [
  { text: "Search", icon: getAssetPrefix() + "/icons/discover.svg", href: "/" },
  { text: "Browse", icon: "", href: "/studies" },
  {
    text: "Explore",
    icon: getAssetPrefix() + "/icons/explore.svg",
    href: "/explore",
  },
  {
    text: "Compare",
    icon: getAssetPrefix() + "/icons/compare.svg",
    href: "/compare",
  },
  {
    text: "Saves",
    icon: getAssetPrefix() + "/icons/saves.svg",
    href: "/saves",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  // Use CSS media queries for responsive behavior instead of client-side logic
  return (
    <>
      {/* Mobile Sidebar */}
      <Box
        component="nav"
        sx={{
          width: "100%",
          height: 64,
          position: "fixed",
          top: 0,
          left: 0,
          bgcolor: "#FAF8FF",
          borderBottom: "1px solid",
          borderColor: "grey.200",
          zIndex: 1200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          px: 2,
          // Hide on desktop
          "@media (min-width: 900px)": {
            display: "none",
          },
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            position: "absolute",
            left: 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Link href="/">
            <Image
              src={getAssetPrefix() + "/harmony.png"}
              alt="Harmony Logo"
              width={40}
              height={40}
              priority
              style={{ objectFit: "contain" }}
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
                minHeight: 48,
                px: 1,
                py: 0.5,
                borderRadius: 2,
                color: pathname === item.href ? "primary.main" : "#444653",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: pathname === item.href ? "action.selected" : "inherit",
                "&.Mui-selected": {
                  bgcolor: "action.selected",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  color: "inherit",
                  position: "relative",
                  mb: 0.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.text === "Browse" ? (
                  <LayoutGrid
                    size={16}
                    style={{
                      position: "relative",
                      zIndex: 1,
                    }}
                  />
                ) : (
                  <Image
                    src={item.icon as string}
                    alt={`${item.text} icon`}
                    width={16}
                    height={16}
                    style={{
                      position: "relative",
                      zIndex: 1,
                    }}
                  />
                )}
              </ListItemIcon>
              <Typography
                variant="caption"
                sx={{
                  color: "#444653",
                  fontSize: "10px",
                  fontWeight: 500,
                  textAlign: "center",
                }}
              >
                {item.text}
              </Typography>
            </ListItemButton>
          ))}
        </Box>
      </Box>

      {/* Desktop Sidebar */}
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
          bgcolor: "#FAF8FF",
          overflow: "hidden",
          // Hide on mobile
          "@media (max-width: 899px)": {
            display: "none",
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ p: 1, pt: 3, display: "flex", justifyContent: "center" }}>
          <Link href="/">
            <Image
              src={getAssetPrefix() + "/harmony.png"}
              alt="Harmony Logo"
              width={64}
              height={64}
              priority
              style={{ objectFit: "contain" }}
            />
          </Link>
        </Box>

        {/* Navigation Items */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            width: "100%",
          }}
        >
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
                  flexDirection: "column",
                  color: pathname === item.href ? "primary.main" : "#444653",
                  "&.Mui-selected": {
                    bgcolor: "action.selected",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    color: "inherit",
                    position: "relative",
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  {item.text === "Browse" ? (
                    <LayoutGrid
                      size={20}
                      style={{
                        position: "relative",
                        zIndex: 1,
                      }}
                    />
                  ) : (
                    <Image
                      src={item.icon}
                      alt={`${item.text} icon`}
                      width={20}
                      height={20}
                      style={{
                        position: "relative",
                        zIndex: 1,
                      }}
                    />
                  )}
                </ListItemIcon>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#444653",
                    fontSize: "12px",
                    fontWeight: 500,
                    textAlign: "center",
                  }}
                >
                  {item.text}
                </Typography>
              </ListItemButton>
            </ListItem>
          ))}
        </Box>
      </Box>
    </>
  );
}
