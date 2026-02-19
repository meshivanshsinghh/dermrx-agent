import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/p/:patientId/s/:sessionId",
        destination: "/",
      },
      {
        source: "/p/:patientId",
        destination: "/",
      },
      // Legacy long-form URLs (backward compat)
      {
        source: "/patient/:patientId/session/:sessionId",
        destination: "/",
      },
      {
        source: "/patient/:patientId",
        destination: "/",
      },
    ];
  },
};

export default nextConfig;
