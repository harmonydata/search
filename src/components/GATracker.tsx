"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Checks if the harmonyCookieConsent cookie exists
 * This cookie is shared between harmonydata.github.io and discoverynext
 */
const getCookieConsentValue = (cookieName: string): boolean => {
  if (typeof document === "undefined") return false;
  
  const cookies = document.cookie.split("; ");
  const cookie = cookies.find((row) => row.startsWith(`${cookieName}=`));
  return !!cookie;
};

/**
 * GATracker - Configures Google Analytics based on cookie consent
 * - With consent: Full tracking (normal mode)
 * - Without consent: Anonymized tracking (GDPR compliant)
 * Also listens for cookie changes in case user accepts consent on harmonydata site
 */
export default function GATracker() {
  const [hasConsent, setHasConsent] = useState(false);
  const [gaConfigured, setGaConfigured] = useState(false);

  useEffect(() => {
    // Check for consent cookie on mount
    const checkConsent = () => {
      const consent = getCookieConsentValue("harmonyCookieConsent");
      setHasConsent(consent);
      
      // Configure GA based on consent status
      if (
        typeof window !== "undefined" &&
        typeof (window as any).gtag === "function" &&
        !gaConfigured
      ) {
        const gtag = (window as any).gtag;
        if (consent) {
          // Full tracking mode - update config to remove anonymization
          gtag("config", "G-S79J6E39ZP", {
            anonymize_ip: false,
            allow_google_signals: true,
            allow_ad_personalization_signals: true,
          });
          console.log("GA enabled - full tracking mode (consent granted)");
        } else {
          // Anonymized mode - ensure anonymization is enabled
          gtag("config", "G-S79J6E39ZP", {
            anonymize_ip: true,
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
          });
          console.log("GA enabled - anonymized mode (no consent)");
        }
        setGaConfigured(true);
      }
    };

    checkConsent();

    // Poll for cookie changes (in case user accepts on harmonydata site)
    let pollCount = 0;
    const maxPolls = 15; // 15 polls * 2 seconds = 30 seconds
    const pollInterval = setInterval(() => {
      pollCount++;
      const consent = getCookieConsentValue("harmonyCookieConsent");
      const previousConsent = hasConsent;
      
      if (consent !== previousConsent) {
        setHasConsent(consent);
        // Reconfigure GA when consent status changes
        if (
          typeof window !== "undefined" &&
          typeof (window as any).gtag === "function"
        ) {
          const gtag = (window as any).gtag;
          if (consent) {
            gtag("config", "G-S79J6E39ZP", {
              anonymize_ip: false,
              allow_google_signals: true,
              allow_ad_personalization_signals: true,
            });
            console.log("GA updated - switched to full tracking mode");
          } else {
            gtag("config", "G-S79J6E39ZP", {
              anonymize_ip: true,
              allow_google_signals: false,
              allow_ad_personalization_signals: false,
            });
            console.log("GA updated - switched to anonymized mode");
          }
        }
      }
      
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [hasConsent, gaConfigured]);

  // Initial GA config is set in layout.tsx with anonymized mode
  // This component will update it if consent is found
  return null;
}
