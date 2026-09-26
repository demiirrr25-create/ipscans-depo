import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ipscans — IP Sorgulama, Ağ Tarama ve Hız Testi",
    short_name: "ipscans",
    description:
      "IP adresi sorgulama, DNS/WHOIS sorgulama, port kontrol ve internet hız testi araçları.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0B0D",
    theme_color: "#0A0B0D",
    icons: [
      { src: "/api/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/api/icons/512", sizes: "512x512", type: "image/png" },
      {
        src: "/api/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
