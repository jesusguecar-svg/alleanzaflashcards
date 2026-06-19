import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a fully static site (HTML/CSS/JS) into `out/` so the app can be
  // dropped onto any static host/CDN and embedded in iframes with no server.
  output: "export",
  // Each domain renders to its own folder + index.html (e.g.
  // /types-of-policies-life/index.html), keeping clean sub-URLs working on
  // static hosts.
  trailingSlash: true,
  images: {
    // next/image optimization needs a server; disable it for static export.
    unoptimized: true,
  },
};

export default nextConfig;
