import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;
