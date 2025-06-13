"use client";

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
import { usePathname } from "next/navigation";

const navigationItems = [
  { text: "Search", icon: "/search/icons/discover.svg", href: "/" },
  { text: "Explore", icon: "/search/icons/explore.svg", href: "/explore" },
  { text: "Compare", icon: "/search/icons/compare.svg", href: "/compare" },
  { text: "Saves", icon: "/search/icons/saves.svg", href: "/saves" },
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
        bgcolor: "#FAF8FF",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 1, pt: 3, display: "flex", justifyContent: "center" }}>
        <Image
          src="/search/harmony.png"
          alt="Harmony Logo"
          width={64}
          height={64}
          priority
          style={{ objectFit: "contain" }}
        />
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
