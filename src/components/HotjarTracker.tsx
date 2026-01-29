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
 * HotjarTracker - Only loads Hotjar if user has consented via harmonyCookieConsent cookie
 * This ensures Hotjar is only loaded after consent, sharing the same cookie as harmonydata.github.io
 * Also listens for cookie changes in case user accepts consent on the harmonydata site
 */
export default function HotjarTracker() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Check for consent cookie on mount
    const checkConsent = () => {
      const consent = getCookieConsentValue("harmonyCookieConsent");
      setHasConsent(consent);
      if (consent) {
        console.log("Hotjar enabled - consent cookie found");
      }
    };

    checkConsent();

    // Poll for cookie changes (in case user accepts on harmonydata site)
    // Check every 2 seconds for the first 30 seconds, then every 10 seconds
    let pollCount = 0;
    const maxPolls = 15; // 15 polls * 2 seconds = 30 seconds
    const pollInterval = setInterval(() => {
      pollCount++;
      checkConsent();
      
      // After initial polling, reduce frequency
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        // Continue checking less frequently
        const slowPollInterval = setInterval(() => {
          checkConsent();
        }, 10000); // Every 10 seconds
        
        // Clean up after 5 minutes
        setTimeout(() => {
          clearInterval(slowPollInterval);
        }, 300000);
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  // Only render the script if consent cookie exists
  if (!hasConsent) {
    return null;
  }

  return (
    <Script id="hotjar" strategy="afterInteractive">
      {`
        (function (h, o, t, j, a, r) {
          h.hj =
            h.hj ||
            function () {
              (h.hj.q = h.hj.q || []).push(arguments);
            };
          h._hjSettings = { hjid: 3792735, hjsv: 6 };
          a = o.getElementsByTagName("head")[0];
          r = o.createElement("script");
          r.async = 1;
          r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
          a.appendChild(r);
        })(window, document, "https://static.hotjar.com/c/hotjar-", ".js?sv=");
      `}
    </Script>
  );
}
