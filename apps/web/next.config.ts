import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@ricenation/sheets"],
  serverExternalPackages: ["googleapis", "google-auth-library"],
};

export default nextConfig;
