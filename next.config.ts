import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "ffprobe-static",
    "ffmpeg-static",
  ],
};

export default nextConfig;