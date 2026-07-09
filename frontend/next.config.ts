import fs from "fs";
import type { NextConfig } from "next";
import path from "path";

function loadRootEnv() {
  const rootEnvPath = path.resolve(__dirname, "..", ".env");

  if (!fs.existsSync(rootEnvPath)) {
    return;
  }

  const envFile = fs.readFileSync(rootEnvPath, "utf8");

  for (const rawLine of envFile.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();

const defaultApiUrl =
  process.env.NODE_ENV === "production"
    ? "https://api.ntthuha.id.vn"
    : `http://localhost:${process.env.API_GATEWAY_PORT || "4000"}`;
const defaultSocketUrl =
  process.env.NODE_ENV === "production"
    ? "https://api.ntthuha.id.vn"
    : "http://localhost:4006";

process.env.NEXT_PUBLIC_API_URL ??=
  process.env.API_GATEWAY_URL || defaultApiUrl;
process.env.NEXT_PUBLIC_SOCKET_URL ??=
  process.env.TRYON_SERVICE_URL || defaultSocketUrl;

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
