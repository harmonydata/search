"use client";

import React, { useState, useEffect } from "react";
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
import AccountAvatar from "./AccountAvatar";
import { getCurrentDomain, getReactAppPath } from "@/lib/utils/urlHelpers";
import ComingSoonDialog from "./ComingSoonDialog";

const baseNavigationItems = [
  {
    text: "Search",
    icon: getAssetPrefix() + "icons/discover.svg",
    activeIcon: getAssetPrefix() + "icons/discover-active.svg",
    href: "/",
  },
  {
    text: "Browse",
    icon: "",
    activeIcon: "",
    href: "/studies",
  },
  {
    text: "Explore",
    icon: getAssetPrefix() + "icons/explore.svg",
    activeIcon: getAssetPrefix() + "icons/explore-active.svg",
    href: "/explore",
  },
  {
    text: "Compare",
    icon: getAssetPrefix() + "icons/compare.svg",
    activeIcon: getAssetPrefix() + "icons/compare-active.svg",
    href: "/compare",
  },
  {
    text: "Saves",
    icon: getAssetPrefix() + "icons/saves.svg",
    activeIcon: getAssetPrefix() + "icons/saves-active.svg",
    href: "/saves",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [navigationItems, setNavigationItems] = useState(baseNavigationItems);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState<string>("");

  const handleNavigationClick = (
    e: React.MouseEvent,
    item: (typeof baseNavigationItems)[0]
  ) => {
    // For Browse, Explore, Compare, and Saves, show coming soon dialog
    if (["Browse", "Explore", "Compare", "Saves"].includes(item.text)) {
      e.preventDefault();
      setComingSoonFeature(item.text);
      setComingSoonOpen(true);
    }
    // Search and Harmonise should work normally
  };

  // Generate harmonise link on client side only
  useEffect(() => {
    const harmoniseItem = {
      text: "Harmonise",
      icon: getAssetPrefix() + "icons/harmonise.svg",
      activeIcon: getAssetPrefix() + "icons/harmonise-active.svg",
      href: `${getCurrentDomain()}${getReactAppPath()}`,
    };
    setNavigationItems([...baseNavigationItems, harmoniseItem]);
  }, []);

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
              src={getAssetPrefix() + "harmony.png"}
              alt="Harmony Logo"
              width={40}
              height={40}
              priority
              style={{ objectFit: "contain" }}
            />
          </Link>
        </Box>

        {/* Navigation Items - Hidden on mobile, moved to avatar menu */}
        <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 2 }}>
          {navigationItems.map((item) => {
            const isExternal = item.href.startsWith("http");
            const LinkComponent = isExternal ? "a" : Link;
            const linkProps = isExternal
              ? {
                  href: item.href,
                }
              : { href: item.href };

            return (
              <ListItemButton
                key={item.text}
                component={LinkComponent}
                {...linkProps}
                onClick={(e) => handleNavigationClick(e, item)}
                selected={!isExternal && pathname === item.href}
                sx={{
                  flexDirection: "column",
                  minWidth: 48,
                  minHeight: 48,
                  px: 1,
                  py: 0.5,
                  borderRadius: 2,
                  color:
                    !isExternal && pathname === item.href
                      ? "primary.main"
                      : "#444653",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor:
                    !isExternal && pathname === item.href
                      ? "action.selected"
                      : "inherit",
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
                      color={
                        !isExternal && pathname === item.href
                          ? "#2E5FFF"
                          : "#444653"
                      }
                      style={{
                        position: "relative",
                        zIndex: 1,
                      }}
                    />
                  ) : (
                    <Image
                      src={
                        !isExternal && pathname === item.href
                          ? (item.activeIcon as string)
                          : (item.icon as string)
                      }
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

        {/* Account Avatar - Mobile */}
        <Box
          sx={{
            position: "absolute",
            right: 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          <AccountAvatar isMobile={true} />
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
              src={getAssetPrefix() + "harmony.png"}
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
          {navigationItems.map((item) => {
            const isExternal = item.href.startsWith("http");
            const LinkComponent = isExternal ? "a" : Link;
            const linkProps = isExternal
              ? {
                  href: item.href,
                }
              : { href: item.href };

            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={LinkComponent}
                  {...linkProps}
                  onClick={(e) => handleNavigationClick(e, item)}
                  selected={!isExternal && pathname === item.href}
                  sx={{
                    minHeight: 48,
                    justifyContent: "center",
                    px: 2.5,
                    flexDirection: "column",
                    color:
                      !isExternal && pathname === item.href
                        ? "primary.main"
                        : "#444653",
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
                        color={
                          !isExternal && pathname === item.href
                            ? "#2E5FFF"
                            : "#444653"
                        }
                        style={{
                          position: "relative",
                          zIndex: 1,
                        }}
                      />
                    ) : (
                      <Image
                        src={
                          !isExternal && pathname === item.href
                            ? (item.activeIcon as string)
                            : (item.icon as string)
                        }
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
        </Box>

        {/* User Avatar at Bottom - Desktop */}
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <AccountAvatar isMobile={false} />
        </Box>
      </Box>
      <ComingSoonDialog
        open={comingSoonOpen}
        onClose={() => setComingSoonOpen(false)}
        featureName={comingSoonFeature}
      />
    </>
  );
}
