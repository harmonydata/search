"use client";

import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";

const navigationItems = [
  { text: "Search", icon: "/icons/discover.svg", href: "/" },
  { text: "Browse", icon: "", href: "/studies" },
  { text: "Explore", icon: "/icons/explore.svg", href: "/explore" },
  { text: "Compare", icon: "/icons/compare.svg", href: "/compare" },
  { text: "Saves", icon: "/icons/saves.svg", href: "/saves" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  if (isMobile) {
    return (
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
              src="/harmony.png"
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
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <ListItemButton
                key={item.text}
                component={Link}
                href={item.href}
                sx={{
                  flexDirection: "column",
                  minWidth: 48,
                  minHeight: 48,
                  px: 1,
                  py: 0.5,
                  borderRadius: 2,
                  color: "#444653",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
                    ...(isActive && {
                      "&:before": {
                        content: '""',
                        position: "absolute",
                        width: 32,
                        height: 20,
                        borderRadius: 10,
                        bgcolor: "secondary.main",
                        zIndex: 0,
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      },
                    }),
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
            );
          })}
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
        bgcolor: "#FAF8FF",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 1, pt: 3, display: "flex", justifyContent: "center" }}>
        <Link href="/">
          <Image
            src="/harmony.png"
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
        <List sx={{ py: 0 }}>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <ListItem
                key={item.text}
                disablePadding
                sx={{
                  mb: 2,
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                }}
              >
                <ListItemButton
                  component={Link}
                  href={item.href}
                  sx={{
                    minHeight: 48,
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 0.5,
                    px: 2.5,
                    color: "#444653",
                    width: "100%",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: 0,
                      justifyContent: "center",
                      color: "inherit",
                      position: "relative",
                      width: "100%",
                      ...(isActive && {
                        "&:before": {
                          content: '""',
                          position: "absolute",
                          width: 48,
                          height: 32,
                          borderRadius: 16,
                          bgcolor: "secondary.main",
                          zIndex: 0,
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                        },
                      }),
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
            );
          })}
        </List>
      </Box>
    </Box>
  );
}
