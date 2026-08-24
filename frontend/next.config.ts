import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Whitelist your phone's specific IP address
  allowedDevOrigins: ['10.218.170.60', 'localhost'],
};

export default nextConfig;