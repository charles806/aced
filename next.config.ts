import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse / pdfjs-dist must run from node_modules (they need native canvas
  // and a DOMMatrix polyfill the Next bundler can't provide on the server).
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/inngest": [
      "./node_modules/pdf-parse/**",
      "./node_modules/pdfjs-dist/**",
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**",
    ],
  },
};

export default nextConfig;
