import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp ships prebuilt native binaries; keep it external so Next doesn't try to
  // bundle them into the server build (required for image thumbnails on Vercel).
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
