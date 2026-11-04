import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] }, { source: '/sw-assets.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] }, { source: '/:path*', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }] }];
  },
  // Use Next.js native CSS and CSS Modules support. A blanket *.css
  // Turbopack loader strips CSS module exports, leaving className undefined.
};

export default nextConfig;
