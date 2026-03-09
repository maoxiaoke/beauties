import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Turbopack is the default in Next.js 16
	turbopack: {},
	webpack: (config) => {
		// Needed for sql.js to work with Next.js (webpack fallback)
		config.resolve.fallback = {
			...config.resolve.fallback,
			fs: false,
			path: false,
			crypto: false,
		};
		return config;
	},
};

export default nextConfig;
