import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp ships prebuilt native binaries; keep it external so Next doesn't try to
  // bundle them into the server build (required for image thumbnails on Vercel).
  serverExternalPackages: ["sharp"],
  async redirects() {
    return [
      // The crew directory now lives inside Duty Free (Crew object); keep old
      // /team links working. 308 permanent (master-plan Q2).
      { source: "/team", destination: "/duty-free", permanent: true },
    ];
  },
};

export default nextConfig;
