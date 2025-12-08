"use client";

import React, { useState } from "react";
import {
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Typography,
} from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";
import { Logout, JoinInner } from "@mui/icons-material";
import { LayoutGrid } from "lucide-react";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";
import TwitterIcon from "@mui/icons-material/Twitter";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAssetPrefix } from "@/lib/utils/shared";
import { getCurrentDomain, getReactAppPath } from "@/lib/utils/urlHelpers";
import ComingSoonDialog from "./ComingSoonDialog";
const settings = ["My Harmony", "Logout"];

const SettingsIcons = {
  "My Harmony": <JoinInner />,
  Logout: <Logout />,
};

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

interface AccountAvatarProps {
  isMobile?: boolean;
}

export default function AccountAvatar({
  isMobile = false,
}: AccountAvatarProps) {
  const [anchorUser, setAnchorUser] = useState<null | HTMLElement>(null);
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
      handleCloseUserMenu();
    }
    // Search and Harmonise should work normally
  };
  const [navigationItems, setNavigationItems] = useState(baseNavigationItems);
  const pathname = usePathname();
  const {
    currentUser,
    logout,
    signInWithGoogle,
    signInWithGitHub,
    signInWithTwitter,
  } = useAuth();

  // Generate harmonise link on client side only
  React.useEffect(() => {
    const harmoniseItem = {
      text: "Harmonise",
      icon: getAssetPrefix() + "icons/harmonise.svg",
      activeIcon: getAssetPrefix() + "icons/harmonise-active.svg",
      href: `${getCurrentDomain()}${getReactAppPath()}`,
    };
    setNavigationItems([...baseNavigationItems, harmoniseItem]);
  }, []);

  // User menu handlers
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorUser(event.currentTarget);
  };

  const handleUserMenuClick = (menuItem: string) => {
    switch (menuItem) {
      case "Logout":
        handleCloseUserMenu();
        console.log("logging out");
        logout();
        break;
      default:
    }
  };

  const handleCloseUserMenu = () => {
    setAnchorUser(null);
  };

  const handleSignIn = async (provider: () => Promise<any>) => {
    try {
      await provider();
      handleCloseUserMenu();
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  return (
    <>
      <Tooltip title="My Harmony">
        <Avatar
          key={(currentUser && currentUser.uid) || "anonUser"}
          src={currentUser?.photoURL || undefined}
          imgProps={{ referrerPolicy: "no-referrer" }}
          onClick={handleOpenUserMenu}
          sx={{
            display: "flex",
            cursor: "pointer",
            width: isMobile ? 40 : 48,
            height: isMobile ? 40 : 48,
          }}
        >
          {currentUser &&
            !currentUser.photoURL &&
            currentUser.email?.substring(0, 1).toUpperCase()}
        </Avatar>
      </Tooltip>
      <Menu
        sx={{
          mt: isMobile ? "45px" : "-8px",
          maxWidth: "50%",
          "& .MuiPaper-root": {
            transform: isMobile ? "none" : "translateY(-100%)",
          },
        }}
        id="menu-appbar"
        anchorEl={anchorUser}
        anchorOrigin={{
          vertical: isMobile ? "bottom" : "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: isMobile ? "top" : "bottom",
          horizontal: "right",
        }}
        open={Boolean(anchorUser)}
        onClose={handleCloseUserMenu}
      >
        {/* Navigation items for mobile */}
        {isMobile &&
          navigationItems.map((item) => {
            const isExternal = item.href.startsWith("http");
            const isActive = !isExternal && pathname === item.href;

            return (
              <MenuItem
                key={item.text}
                component={isExternal ? "a" : Link}
                href={item.href}
                onClick={(e) => {
                  handleNavigationClick(e, item);
                  if (
                    !["Browse", "Explore", "Compare", "Saves"].includes(
                      item.text
                    )
                  ) {
                    handleCloseUserMenu();
                  }
                }}
                sx={{
                  color: isActive ? "primary.main" : "inherit",
                  bgcolor: isActive ? "action.selected" : "inherit",
                }}
              >
                {item.text === "Browse" ? (
                  <LayoutGrid
                    size={20}
                    color={isActive ? "#2E5FFF" : "#444653"}
                  />
                ) : (
                  <Image
                    src={isActive ? item.activeIcon : item.icon}
                    alt={`${item.text} icon`}
                    width={20}
                    height={20}
                  />
                )}
                <Typography textAlign="center" sx={{ pl: 1 }}>
                  {item.text}
                </Typography>
              </MenuItem>
            );
          })}

        {/* Divider between navigation and settings */}
        {isMobile && <Divider />}

        {settings.map((setting) => (
          <MenuItem
            key={setting}
            onClick={() => handleUserMenuClick(setting)}
            disabled={!currentUser}
          >
            {SettingsIcons[setting as keyof typeof SettingsIcons]}
            <Typography textAlign="center" sx={{ pl: 1 }}>
              {setting}
            </Typography>
          </MenuItem>
        ))}
        {!currentUser && [
          <Divider key="oauthSigninDiv" />,
          <Typography
            key="oauthSigninText"
            sx={{ margin: "0 0.5rem", textAlign: "center", p: 1 }}
          >
            Signing in with one of the OAuth providers below allows you access
            to My Harmony where you can save and share your harmonisations.
          </Typography>,
        ]}
        {!currentUser && (
          <MenuItem
            key="SSOGoogle"
            onClick={() => handleSignIn(signInWithGoogle)}
          >
            <GoogleIcon />
            <Typography textAlign="center" sx={{ pl: 1 }}>
              Sign in with Google
            </Typography>
          </MenuItem>
        )}
        {!currentUser && (
          <MenuItem
            key="SSOGithub"
            onClick={() => handleSignIn(signInWithGitHub)}
          >
            <GitHubIcon />
            <Typography textAlign="center" sx={{ pl: 1 }}>
              Sign in with GitHub
            </Typography>
          </MenuItem>
        )}
        {!currentUser && (
          <MenuItem
            key="SSOTwitter"
            onClick={() => handleSignIn(signInWithTwitter)}
          >
            <TwitterIcon />
            <Typography textAlign="center" sx={{ pl: 1 }}>
              Sign in with Twitter
            </Typography>
          </MenuItem>
        )}
      </Menu>
      <ComingSoonDialog
        open={comingSoonOpen}
        onClose={() => setComingSoonOpen(false)}
        featureName={comingSoonFeature}
      />
    </>
  );
}
