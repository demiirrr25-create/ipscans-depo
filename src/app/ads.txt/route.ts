// ads.txt authorizes Google AdSense to sell ad inventory on this domain —
// required once the AdSense account is approved, to prevent ad fraud.
// Set NEXT_PUBLIC_ADSENSE_PUBLISHER_ID (e.g. "pub-1234567890123456") once
// you have it from the AdSense dashboard.
export function GET() {
  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
  const body = pubId
    ? `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`
    : "";
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
