import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  serverExternalPackages: ["bcryptjs", "ws"],
  allowedDevOrigins: ["*.app.github.dev", "localhost:3000", "127.0.0.1:3000"],
};

export default nextConfig;
