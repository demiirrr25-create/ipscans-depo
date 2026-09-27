// ads.txt authorizes Google AdSense to sell ad inventory on this domain —
// required once the AdSense account is approved, to prevent ad fraud.
// Derived from NEXT_PUBLIC_ADSENSE_CLIENT_ID ("ca-pub-...") by default;
// set NEXT_PUBLIC_ADSENSE_PUBLISHER_ID explicitly ("pub-...") to override.
export function GET() {
  const pubId =
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ||
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.replace(/^ca-/, "");
  const body = pubId
    ? `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`
    : "";
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
