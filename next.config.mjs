import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/app/:workspace/settings",
        destination: "/app/:workspace/settings/profile",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
