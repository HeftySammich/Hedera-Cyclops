/** @type {import('next').NextConfig} */

// Derive image remote hostnames from env so no hostname is hardcoded.
function hostFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const remoteHosts = [
  hostFromUrl(process.env.OBJECT_STORAGE_PUBLIC_URL),
  hostFromUrl(process.env.OBJECT_STORAGE_ENDPOINT),
  hostFromUrl(process.env.IPFS_GATEWAY_URL),
].filter(Boolean);

const remotePatterns = remoteHosts.map((hostname) => ({
  protocol: 'https',
  hostname,
}));

// Fallback: allow any https host when nothing is configured yet (dev/placeholder).
if (remotePatterns.length === 0) {
  remotePatterns.push({ protocol: 'https', hostname: '**' });
}

const nextConfig = {
  reactStrictMode: true,
  // ESLint config versions can drift from the Next major; do not fail the
  // production build on lint. Lint is run separately via `npm run lint`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns,
  },
  webpack: (config) => {
    // WalletConnect pulls optional deps that are not needed in our bundle.
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
