import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default bottom-left position sits directly on top of the Sidebar's Sign Out button.
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
