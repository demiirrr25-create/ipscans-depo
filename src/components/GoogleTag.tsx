import Script from "next/script";

/**
 * Loads Google's gtag.js once IDs are configured via env vars, and wires up
 * GA4 (site analytics), Google Ads (conversion tracking), and AdSense (ad
 * serving). Renders nothing until at least one ID is set, so it's safe to
 * keep in the tree before those accounts exist.
 *
 * Set in Vercel / .env.local:
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 *   NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXX
 *   NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
 *
 * Consent Mode v2: ad/analytics storage default to "denied" until the
 * visitor accepts the cookie banner (see CookieConsent.tsx), as required by
 * Google for serving ads/analytics to EEA/UK/CH visitors.
 */
export function GoogleTag() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const gtagIds = [gaId, adsId].filter(Boolean);
  if (gtagIds.length === 0 && !adsenseId) return null;

  return (
    <>
      {gtagIds.length > 0 && (
        <>
          <Script id="google-consent-default" strategy="beforeInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: 'denied',
                wait_for_update: 500
              });
            `}
          </Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`}
            strategy="afterInteractive"
          />
          <Script id="google-tag-init" strategy="afterInteractive">
            {`
              gtag('js', new Date());
              ${gtagIds.map((id) => `gtag('config', '${id}');`).join("\n              ")}
            `}
          </Script>
        </>
      )}
      {adsenseId && (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
    </>
  );
}

