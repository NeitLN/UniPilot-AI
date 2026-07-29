import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in a parent directory (outside this repo) was
  // making Turbopack infer the wrong workspace root, which broke module
  // resolution (e.g. Supabase's SSR adapter) at dev-server runtime.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
