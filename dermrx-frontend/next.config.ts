import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/app/p/:patientId/s/:sessionId",
        destination: "/app",
      },
      {
        source: "/app/p/:patientId",
        destination: "/app",
      },
      // Legacy long-form URLs (backward compat)
      {
        source: "/app/patient/:patientId/session/:sessionId",
        destination: "/app",
      },
      {
        source: "/app/patient/:patientId",
        destination: "/app",
      },
    ];
  },
};

export default nextConfig;
